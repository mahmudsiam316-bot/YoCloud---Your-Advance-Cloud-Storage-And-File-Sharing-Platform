import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Find expired active subscriptions
    const { data: expired, error: fetchErr } = await admin
      .from("api_subscriptions")
      .select("id, user_id, plan, expires_at, auto_renew")
      .eq("status", "active")
      .not("plan", "eq", "free")
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString());

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ message: "No expired subscriptions", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let downgraded = 0;
    let renewed = 0;

    for (const sub of expired) {
      // Auto-renew is not implemented with payment yet, so just downgrade
      // In future: if sub.auto_renew, attempt payment charge
      
      // Downgrade to free
      const { error: updateErr } = await admin
        .from("api_subscriptions")
        .update({
          plan: "free",
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      if (!updateErr) {
        downgraded++;

        // Notify user
        await admin.from("notifications").insert({
          user_id: sub.user_id,
          type: "warning",
          title: "API Plan Expired",
          message: `Your API ${sub.plan} plan has expired. You've been downgraded to the Free plan (3 RPM). Upgrade again to restore your limits.`,
        });
      }
    }

    const result = {
      message: "Subscription check complete",
      total_expired: expired.length,
      downgraded,
      renewed,
      timestamp: new Date().toISOString(),
    };

    console.log("Subscription check result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
