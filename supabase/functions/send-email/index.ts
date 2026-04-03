import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EmailType = "verification" | "welcome" | "payment_success" | "payment_cancelled";

interface EmailRequest {
  type: EmailType;
  to: string;
  data?: Record<string, string | number>;
}

function getSubject(type: EmailType, data?: Record<string, string | number>): string {
  switch (type) {
    case "verification": return "YoCloud verification code";
    case "welcome": return "Welcome to YoCloud";
    case "payment_success": return "YoCloud payment confirmed";
    case "payment_cancelled": return "YoCloud payment update";
    default: return "YoCloud update";
  }
}

function getHtml(type: EmailType, data?: Record<string, string | number>): string {
  const brand = "#1d4ed8";
  const text = "#0f172a";
  const muted = "#64748b";
  const light = "#eff6ff";
  const border = "#e2e8f0";
  const green = "#166534";
  const red = "#b91c1c";
  const soft = "#f8fafc";
  const discordUrl = "https://discord.gg/8jz3pUaebk";
  const facebookUrl = "https://facebook.com/yocloud";
  const instagramUrl = "https://instagram.com/yocloud";

  const wrapper = (content: string) => `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${text};line-height:1.6;">
      <div style="max-width:680px;margin:0 auto;padding:32px 24px 40px;">
        <div style="border-top:4px solid ${brand};padding-top:20px;">
          <div style="padding-bottom:18px;border-bottom:1px solid ${border};">
            <table width="100%" style="border-collapse:collapse;">
              <tr>
                <td style="font-size:22px;font-weight:700;color:${text};letter-spacing:-0.4px;">YoCloud</td>
                <td style="text-align:right;font-size:12px;color:${muted};">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              </tr>
            </table>
            <p style="font-size:12px;color:${muted};margin:8px 0 0;">Official YoCloud email · secure workspace and file delivery updates</p>
          </div>

          <div style="padding:28px 0 18px;">
        ${content}
          </div>

          <div style="padding:18px 0 0;border-top:1px solid ${border};">
            <p style="font-size:11px;color:${muted};margin:0 0 10px;line-height:1.6;">
              This is an automated message from YoCloud. Please do not reply directly to this email.
            </p>
            <p style="font-size:11px;color:${muted};margin:0 0 12px;line-height:1.6;">
              Stay connected with YoCloud:
              <a href="${discordUrl}" style="color:${brand};text-decoration:none;margin-left:6px;">Discord</a>
              <span style="color:${border};margin:0 6px;">•</span>
              <a href="${facebookUrl}" style="color:${brand};text-decoration:none;">Facebook</a>
              <span style="color:${border};margin:0 6px;">•</span>
              <a href="${instagramUrl}" style="color:${brand};text-decoration:none;">Instagram</a>
            </p>
            <p style="font-size:11px;color:${muted};margin:0;line-height:1.6;">© ${new Date().getFullYear()} YoCloud · All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  switch (type) {
    case "verification":
      return wrapper(`
        <p style="font-size:12px;color:${brand};margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Email verification</p>
        <h1 style="font-size:28px;font-weight:700;color:${text};margin:0 0 12px;line-height:1.2;">Confirm your YoCloud email</h1>
        <p style="font-size:15px;color:${muted};margin:0 0 24px;">Use the verification code below to complete sign-in or account setup. This code stays valid for 10 minutes.</p>
        <div style="text-align:center;padding:18px 12px;margin:0 0 22px;background:${soft};border-top:1px solid ${border};border-bottom:1px solid ${border};">
          <span style="font-size:40px;font-weight:800;color:${text};letter-spacing:10px;font-family:'SF Mono','Fira Code','Courier New',monospace;">
            ${data?.otp || "------"}
          </span>
        </div>
        <p style="font-size:13px;color:${muted};margin:0;">If you did not request this YoCloud verification code, you can ignore this email and your account will remain unchanged.</p>
      `);

    case "welcome":
      return wrapper(`
        <p style="font-size:12px;color:${brand};margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Welcome</p>
        <h1 style="font-size:28px;font-weight:700;color:${text};margin:0 0 12px;line-height:1.2;">Welcome to YoCloud, ${data?.name || "there"}</h1>
        <p style="font-size:15px;color:${muted};margin:0 0 24px;">Your YoCloud workspace is ready. Here is a clear summary of your starting setup.</p>
        <table width="100%" style="font-size:14px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Email</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">${data?.email || ""}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Plan</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">Free · 5 GB</td>
          </tr>
          <tr>
            <td style="padding:12px 0;color:${muted};">Status</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${green};">Active</td>
          </tr>
        </table>
        <p style="font-size:13px;color:${muted};margin:24px 0 0;">You can now upload files, organize workspaces, share content securely, and manage everything from one official YoCloud workspace.</p>
      `);

    case "payment_success":
      return wrapper(`
        <p style="font-size:12px;color:${green};margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Payment confirmed</p>
        <h1 style="font-size:28px;font-weight:700;color:${text};margin:0 0 12px;line-height:1.2;">Your YoCloud upgrade is active</h1>
        <p style="font-size:15px;color:${muted};margin:0 0 24px;">Thank you for your payment. Your account has been updated and the new storage allocation is now available.</p>
        <table width="100%" style="font-size:14px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Plan</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">${data?.plan_name || "N/A"}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Amount</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">৳${data?.amount || "0"}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Storage Added</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">${data?.storage_added || "N/A"}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Transaction ID</td>
            <td style="padding:12px 0;text-align:right;font-weight:500;color:${muted};font-size:12px;font-family:monospace;">${data?.transaction_id || "N/A"}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Date</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">${data?.date || new Date().toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;color:${muted};">Status</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${green};">Completed</td>
          </tr>
        </table>
        <p style="font-size:13px;color:${muted};margin:24px 0 0;">Keep this YoCloud payment confirmation for your billing history and storage upgrade reference.</p>
      `);

    case "payment_cancelled":
      return wrapper(`
        <p style="font-size:12px;color:${red};margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Payment cancelled</p>
        <h1 style="font-size:28px;font-weight:700;color:${text};margin:0 0 12px;line-height:1.2;">Your YoCloud payment was not completed</h1>
        <p style="font-size:15px;color:${muted};margin:0 0 24px;">No charge was finalized for this attempt. You can review the details below and try the upgrade again whenever you are ready.</p>
        <table width="100%" style="font-size:14px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Plan</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">${data?.plan_name || "N/A"}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Amount</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">৳${data?.amount || "0"}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Transaction ID</td>
            <td style="padding:12px 0;text-align:right;font-weight:500;color:${muted};font-size:12px;font-family:monospace;">${data?.transaction_id || "N/A"}</td>
          </tr>
          <tr style="border-bottom:1px solid ${border};">
            <td style="padding:12px 0;color:${muted};">Date</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${text};">${data?.date || new Date().toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;color:${muted};">Status</td>
            <td style="padding:12px 0;text-align:right;font-weight:600;color:${red};">Cancelled</td>
          </tr>
        </table>
        <p style="font-size:13px;color:${muted};margin:24px 0 0;">If the issue continues, start a new payment attempt from your official YoCloud billing page.</p>
      `);

    default:
      return wrapper(`<p style="font-size:15px;color:${text};margin:0;">You have a new update from YoCloud.</p>`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error("Gmail credentials not configured");
    }

    const { type, to, data } = (await req.json()) as EmailRequest;
    if (!type || !to) throw new Error("Missing type or to");

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    await client.send({
      from: `YoCloud <${GMAIL_USER}>`,
      to,
      subject: getSubject(type, data),
      html: getHtml(type, data),
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send email error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
