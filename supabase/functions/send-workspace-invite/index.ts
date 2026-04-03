import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Not authenticated");

    const { email, workspaceName, role, inviteToken } = await req.json();
    if (!email || !workspaceName) throw new Error("Missing params");

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPass) {
      console.warn("Gmail credentials not configured, skipping email send");
      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = user.email?.split("@")[0] || "Someone";
    const appUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/+$/, "") || "https://app.cloudbox.com";

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827;line-height:1.6;">
        <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
          <table width="100%" style="margin-bottom:32px;"><tr>
            <td style="font-size:18px;font-weight:700;color:#6C63FF;letter-spacing:-0.3px;">CloudBox</td>
            <td style="text-align:right;font-size:12px;color:#6b7280;">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          </tr></table>
          <div style="height:1px;background:#e5e7eb;margin-bottom:32px;"></div>

          <p style="font-size:14px;color:#6C63FF;margin:0 0 4px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Workspace Invitation</p>
          <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 12px;line-height:1.2;">You've been invited to collaborate</h1>
          <p style="font-size:15px;color:#6b7280;margin:0 0 28px;">
            <strong style="color:#111827;">${senderName}</strong> (${user.email}) has invited you to join a workspace.
          </p>

          <table width="100%" style="font-size:14px;border-collapse:collapse;margin-bottom:28px;">
            <tr style="border-bottom:1px solid #e5e7eb;">
              <td style="padding:12px 0;color:#6b7280;">Workspace</td>
              <td style="padding:12px 0;text-align:right;font-weight:700;color:#111827;">${workspaceName}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#6b7280;">Your Role</td>
              <td style="padding:12px 0;text-align:right;font-weight:600;color:#6C63FF;">${role.charAt(0).toUpperCase() + role.slice(1)}</td>
            </tr>
          </table>

          <a href="${appUrl}" style="display:inline-block;padding:12px 28px;background:#6C63FF;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">
            Open CloudBox →
          </a>
          <p style="font-size:13px;color:#9ca3af;margin:16px 0 0;">Sign in to accept this invitation and start collaborating.</p>

          <div style="height:1px;background:#e5e7eb;margin:32px 0 20px;"></div>
          <p style="font-size:11px;color:#6b7280;margin:0;line-height:1.5;">
            You received this because ${user.email} invited you to a workspace.<br/>
            © ${new Date().getFullYear()} CloudBox · All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: gmailUser, password: gmailPass },
      },
    });

    await client.send({
      from: `CloudBox <${gmailUser}>`,
      to: email.trim().toLowerCase(),
      subject: `👥 ${senderName} invited you to "${workspaceName}" — CloudBox`,
      html: emailHtml,
    });

    await client.close();

    // Create notification for the invited user if they exist
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: invitedProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (invitedProfile) {
      await supabase.from("notifications").insert({
        user_id: invitedProfile.id,
        title: "Workspace Invitation",
        message: `${senderName} invited you to join "${workspaceName}" as ${role}`,
        type: "workspace_invite",
      });
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send workspace invite error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
