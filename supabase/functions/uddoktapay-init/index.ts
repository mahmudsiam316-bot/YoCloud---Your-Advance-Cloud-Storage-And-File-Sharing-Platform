import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLANS: Record<string, { name: string; amount: number; storageBytes: number; isApiPlan?: boolean; apiPlan?: string }> = {
  pro: { name: "Pro Plan (10GB)", amount: 299, storageBytes: 10 * 1024 * 1024 * 1024 },
  "add-5gb": { name: "+5GB Storage", amount: 149, storageBytes: 5 * 1024 * 1024 * 1024 },
  "add-10gb": { name: "+10GB Storage", amount: 249, storageBytes: 10 * 1024 * 1024 * 1024 },
  "api-pro": { name: "API Pro Plan", amount: 900, storageBytes: 0, isApiPlan: true, apiPlan: "pro" },
  "api-enterprise": { name: "API Enterprise Plan", amount: 30000, storageBytes: 0, isApiPlan: true, apiPlan: "enterprise" },
};

function getRequestOrigin(req: Request): string {
  const originHeader = req.headers.get("origin");
  if (originHeader) return originHeader;

  const refererHeader = req.headers.get("referer");
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin;
    } catch {
      // Ignore invalid referer
    }
  }

  return "https://id-preview--417f38af-d8ab-4b31-af1c-c56629acda34.lovable.app";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uddoktaPayKey = Deno.env.get("UDDOKTAPAY_API_KEY");
    if (!uddoktaPayKey) throw new Error("UddoktaPay API key not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    const userEmail = claimsData?.claims?.email;

    if (claimsError || !userId || !userEmail) {
      throw new Error("Not authenticated");
    }

    const { planId } = await req.json();
    const plan = PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    const origin = getRequestOrigin(req);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: txn, error: txnErr } = await adminClient
      .from("transactions")
      .insert({
        user_id: userId,
        amount: plan.amount,
        plan: planId,
        storage_added: plan.storageBytes,
        status: "pending",
        is_api_plan: !!plan.isApiPlan,
      })
      .select("id")
      .single();

    if (txnErr) throw new Error(`Transaction create failed: ${txnErr.message}`);

    const paymentRes = await fetch("https://sandbox.uddoktapay.com/api/checkout-v2", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": uddoktaPayKey,
      },
      body: JSON.stringify({
        full_name: userEmail.split("@")[0] || "User",
        email: userEmail,
        amount: String(plan.amount),
        metadata: {
          transaction_id: txn.id,
          user_id: userId,
          plan_id: planId,
        },
        redirect_url: `${origin}/payment/success?txn=${txn.id}`,
        return_type: "GET",
        cancel_url: `${origin}/payment/failed?txn=${txn.id}`,
        webhook_url: `${supabaseUrl}/functions/v1/uddoktapay-verify`,
      }),
    });

    const paymentText = await paymentRes.text();
    if (!paymentRes.ok) {
      throw new Error(`UddoktaPay init failed [${paymentRes.status}]: ${paymentText}`);
    }

    let paymentData: Record<string, unknown>;
    try {
      paymentData = JSON.parse(paymentText);
    } catch {
      throw new Error(`Invalid UddoktaPay init response: ${paymentText}`);
    }

    const paymentUrl = typeof paymentData.payment_url === "string" ? paymentData.payment_url : null;
    if (!paymentUrl) {
      throw new Error(typeof paymentData.message === "string" ? paymentData.message : "Payment URL missing from UddoktaPay response");
    }

    await adminClient
      .from("transactions")
      .update({
        payment_url: paymentUrl,
        invoice_id: typeof paymentData.invoice_id === "string" ? paymentData.invoice_id : null,
        metadata: paymentData,
      })
      .eq("id", txn.id);

    return new Response(
      JSON.stringify({
        payment_url: paymentUrl,
        transaction_id: txn.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Payment init error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
