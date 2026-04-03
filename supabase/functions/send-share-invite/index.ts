import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Not authenticated");

    const { emails, shareId, shareUrl, fileName } = await req.json();
    if (!emails?.length || !shareId) throw new Error("Missing params");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Insert invites
    const invites = emails.map((email: string) => ({
      share_id: shareId,
      email: email.trim().toLowerCase(),
      invited_by: user.id,
    }));

    const { error: insertErr } = await supabase
      .from("share_invites")
      .upsert(invites, { onConflict: "share_id,email" });
    if (insertErr) throw insertErr;

    // Send email directly via SMTP
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (gmailUser && gmailPass) {
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: gmailUser,
            password: gmailPass,
          },
        },
      });

      for (const email of emails) {
        const trimmedEmail = email.trim().toLowerCase();
        const senderName = user.email?.split("@")[0] || "Someone";
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
          <body style="margin:0;padding:0;background:#f8f9fa;font-family:'Segoe UI',Arial,sans-serif;">
            <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;background:#6C63FF;color:#fff;font-size:20px;font-weight:800;padding:10px 20px;border-radius:12px;letter-spacing:1px;">
                  CloudBox
                </div>
              </div>
              <div style="background:#ffffff;border-radius:16px;padding:32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                <div style="text-align:center;">
                  <div style="font-size:40px;margin-bottom:12px;">📁</div>
                  <h1 style="color:#1a1a2e;font-size:22px;font-weight:700;margin:0 0 8px;">File Shared With You</h1>
                  <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
                    <strong>${senderName}</strong> (${user.email}) shared <strong>"${fileName}"</strong> with you.
                  </p>
                  <a href="${shareUrl}" style="display:inline-block;padding:14px 32px;background:#6C63FF;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;margin:0 0 16px;">
                    🔗 Open Shared File
                  </a>
                  <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">
                    Or copy this link: <br/>
                    <span style="color:#6C63FF;word-break:break-all;">${shareUrl}</span>
                  </p>
                </div>
              </div>
              <div style="text-align:center;margin-top:24px;">
                <p style="font-size:12px;color:#6b7280;margin:0;">© ${new Date().getFullYear()} CloudBox. All rights reserved.</p>
                <p style="font-size:11px;color:#9ca3af;margin:4px 0 0;">You received this because ${user.email} shared a file with you.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          await client.send({
            from: `CloudBox <${gmailUser}>`,
            to: trimmedEmail,
            subject: `📁 ${senderName} shared "${fileName}" with you — CloudBox`,
            html: emailHtml,
          });
          console.log(`Invite sent to ${trimmedEmail}`);
        } catch (e) {
          console.error(`Failed to send invite to ${trimmedEmail}:`, e);
        }
      }

      await client.close();
    } else {
      console.warn("Gmail credentials not configured, skipping email send");
    }

    // Create notification for the file owner
    const { data: shareData } = await supabase
      .from("file_shares")
      .select("user_id")
      .eq("id", shareId)
      .single();

    if (shareData) {
      await supabase.from("notifications").insert({
        user_id: shareData.user_id,
        title: "Share Invite Sent",
        message: `You invited ${emails.length} people to "${fileName}"`,
        type: "share",
      });
    }

    return new Response(JSON.stringify({ success: true, count: emails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send share invite error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
