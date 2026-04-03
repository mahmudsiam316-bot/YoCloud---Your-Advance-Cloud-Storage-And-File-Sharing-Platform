import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_NAMES: Record<string, string> = {
  pro: "Pro Plan (10GB)",
  "add-5gb": "+5GB Storage",
  "add-10gb": "+10GB Storage",
  "api-pro": "API Pro Plan",
  "api-enterprise": "API Enterprise Plan",
};

const EXPECTED_AMOUNTS: Record<string, number> = {
  pro: 299,
  "add-5gb": 149,
  "add-10gb": 249,
  "api-pro": 900,
  "api-enterprise": 30000,
};

const API_PLAN_MAP: Record<string, string> = {
  "api-pro": "pro",
  "api-enterprise": "enterprise",
};

const DEFAULT_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;
const PRO_STORAGE_LIMIT = 10 * 1024 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function asObject(value: unknown): JsonRecord {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as JsonRecord
        : {};
    } catch {
      return {};
    }
  }

  return typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function normalizeStatus(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  return `${bytes} B`;
}

async function sendEmail(supabaseUrl: string, type: string, to: string, data: Record<string, string | number>) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

async function parsePayload(req: Request): Promise<JsonRecord> {
  const url = new URL(req.url);
  const queryPayload = Object.fromEntries(url.searchParams.entries());

  if (req.method === "GET") {
    return queryPayload;
  }

  const contentType = req.headers.get("content-type") || "";
  const rawBody = await req.text();

  if (!rawBody) {
    return queryPayload;
  }

  let bodyPayload: JsonRecord = {};

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(rawBody);
      bodyPayload = asObject(parsed);
    } catch {
      bodyPayload = {};
    }
  } else {
    bodyPayload = Object.fromEntries(new URLSearchParams(rawBody).entries());
  }

  return { ...queryPayload, ...bodyPayload };
}

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, supabaseAnonKey: string): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return null;
  }

  return data.claims.sub;
}

async function buildTransactionResponse(adminClient: ReturnType<typeof createClient>, txnId: string, status: string, alreadyProcessed = false) {
  const { data: txn } = await adminClient
    .from("transactions")
    .select("id, plan, amount, currency, invoice_id, status, user_id")
    .eq("id", txnId)
    .maybeSingle();

  const { data: profile } = txn
    ? await adminClient
        .from("profiles")
        .select("storage_plan, storage_limit")
        .eq("id", txn.user_id)
        .maybeSingle()
    : { data: null };

  return jsonResponse({
    status,
    transaction_id: txnId,
    invoice_id: txn?.invoice_id ?? null,
    already_processed: alreadyProcessed,
    transaction: txn
      ? {
          plan: txn.plan,
          amount: Number(txn.amount),
          currency: txn.currency,
        }
      : null,
    profile: profile
      ? {
          storage_plan: profile.storage_plan,
          storage_limit: Number(profile.storage_limit),
        }
      : null,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uddoktaPayKey = Deno.env.get("UDDOKTAPAY_API_KEY");
    if (!uddoktaPayKey) throw new Error("UddoktaPay API key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const payload = await parsePayload(req);
    console.log("Verify request payload:", JSON.stringify(payload));

    const authUserId = await getAuthenticatedUserId(req, supabaseUrl, supabaseAnonKey);
    const requestMetadata = asObject(payload.metadata);

    let invoiceId = pickString(payload.invoice_id, payload.invoiceId, payload.invoice);
    let txnId = pickString(
      payload.txnId,
      payload.txn_id,
      payload.transactionId,
      payload.transaction_id,
      requestMetadata.transaction_id,
      requestMetadata.txnId,
    );

    let txn: Record<string, any> | null = null;

    if (txnId) {
      let txnLookup = adminClient
        .from("transactions")
        .select("*")
        .eq("id", txnId);

      if (authUserId) {
        txnLookup = txnLookup.eq("user_id", authUserId);
      }

      const { data: txnById } = await txnLookup.maybeSingle();
      txn = txnById;

      if (!txn && authUserId) {
        throw new Error("Transaction not found");
      }

      if (!invoiceId && txn?.invoice_id) {
        invoiceId = txn.invoice_id;
      }

      if (txn?.status === "completed") {
        return await buildTransactionResponse(adminClient, txn.id, "completed", true);
      }
    }

    if (!invoiceId) {
      throw new Error("Missing invoice_id for verification. UddoktaPay success redirects must include invoice_id.");
    }

    const verifyRes = await fetch("https://sandbox.uddoktapay.com/api/verify-payment", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": uddoktaPayKey,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });

    const verifyText = await verifyRes.text();
    console.log("UddoktaPay verify response:", verifyRes.status, verifyText);

    let verifyData: JsonRecord;
    try {
      verifyData = asObject(JSON.parse(verifyText));
    } catch {
      throw new Error(`UddoktaPay returned invalid JSON: ${verifyText}`);
    }

    if (!verifyRes.ok) {
      throw new Error(`UddoktaPay verify failed [${verifyRes.status}]: ${verifyText}`);
    }

    const verifyMetadata = asObject(verifyData.metadata);
    const verifiedTxnId = txnId || pickString(verifyMetadata.transaction_id, verifyMetadata.txnId);

    if (!txn && verifiedTxnId) {
      let txnLookup = adminClient
        .from("transactions")
        .select("*")
        .eq("id", verifiedTxnId);

      if (authUserId) {
        txnLookup = txnLookup.eq("user_id", authUserId);
      }

      const { data: txnByVerifiedId } = await txnLookup.maybeSingle();
      txn = txnByVerifiedId;
    }

    if (!txn) {
      const { data: txnByInvoice } = await adminClient
        .from("transactions")
        .select("*")
        .eq("invoice_id", invoiceId)
        .maybeSingle();

      txn = txnByInvoice;
    }

    if (!txn) {
      throw new Error("Transaction not found for verified payment");
    }

    if (authUserId && txn.user_id !== authUserId) {
      throw new Error("Transaction not found");
    }

    if (txn.status === "completed") {
      return await buildTransactionResponse(adminClient, txn.id, "completed", true);
    }

    const paymentStatus = normalizeStatus(verifyData.status);
    const expectedAmount = EXPECTED_AMOUNTS[txn.plan];
    const paidAmount = Number.parseFloat(String(verifyData.amount ?? verifyData.charged_amount ?? 0));
    const gatewayTransactionId = pickString(verifyData.transaction_id, verifyData.trx_id);

    if (paymentStatus === "COMPLETED" && expectedAmount && Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.error(`Amount mismatch for ${txn.id}: expected ${expectedAmount}, got ${paidAmount}`);

      await adminClient
        .from("transactions")
        .update({
          status: "failed",
          invoice_id: invoiceId,
          metadata: {
            ...verifyData,
            error: "amount_mismatch",
            expected_amount: expectedAmount,
            paid_amount: paidAmount,
          },
        })
        .eq("id", txn.id);

      throw new Error("Payment amount does not match expected amount");
    }

    if (paymentStatus !== "COMPLETED") {
      const nextStatus = paymentStatus === "PENDING" ? "pending" : "failed";

      await adminClient
        .from("transactions")
        .update({
          status: nextStatus,
          invoice_id: invoiceId,
          transaction_id: gatewayTransactionId ?? txn.transaction_id,
          metadata: verifyData,
        })
        .eq("id", txn.id);

      if (nextStatus === "failed" && txn.status !== "failed") {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("email")
          .eq("id", txn.user_id)
          .maybeSingle();

        if (profile?.email) {
          await sendEmail(supabaseUrl, "payment_cancelled", profile.email, {
            plan_name: PLAN_NAMES[txn.plan] || txn.plan,
            amount: Number(txn.amount),
            transaction_id: txn.id,
            date: new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" }),
          });
        }
      }

      return jsonResponse({
        status: nextStatus,
        transaction_id: txn.id,
        invoice_id: invoiceId,
        transaction: {
          plan: txn.plan,
          amount: Number(txn.amount),
          currency: txn.currency,
        },
      });
    }

    const { data: claimedTxn } = await adminClient
      .from("transactions")
      .update({
        status: "processing",
        invoice_id: invoiceId,
        transaction_id: gatewayTransactionId ?? txn.transaction_id,
        metadata: verifyData,
      })
      .eq("id", txn.id)
      .or("status.eq.pending,status.eq.failed")
      .select("*")
      .maybeSingle();

    if (!claimedTxn) {
      const { data: latestTxn } = await adminClient
        .from("transactions")
        .select("status")
        .eq("id", txn.id)
        .maybeSingle();

      if (latestTxn?.status === "completed") {
        return await buildTransactionResponse(adminClient, txn.id, "completed", true);
      }

      return jsonResponse({
        status: "pending",
        transaction_id: txn.id,
        invoice_id: invoiceId,
        transaction: {
          plan: txn.plan,
          amount: Number(txn.amount),
          currency: txn.currency,
        },
      });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("storage_limit, storage_plan, email")
      .eq("id", claimedTxn.user_id)
      .single();

    if (profileError || !profile) {
      await adminClient
        .from("transactions")
        .update({
          status: "failed",
          invoice_id: invoiceId,
          metadata: {
            ...verifyData,
            error: "profile_not_found",
          },
        })
        .eq("id", claimedTxn.id);

      throw new Error("Profile not found for transaction user");
    }

    // Check if this is an API plan transaction
    const apiPlanType = API_PLAN_MAP[claimedTxn.plan];
    
    if (apiPlanType) {
      // API plan subscription - upsert api_subscriptions table
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

      const { error: subError } = await adminClient
        .from("api_subscriptions")
        .upsert({
          user_id: claimedTxn.user_id,
          plan: apiPlanType,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          auto_renew: true,
        }, { onConflict: "user_id" });

      if (subError) {
        console.error("API subscription update failed:", subError);
      }
    } else {
      // Storage plan - update profile storage
      const currentLimit = Number(profile.storage_limit ?? DEFAULT_STORAGE_LIMIT);
      const newLimit = claimedTxn.plan === "pro"
        ? Math.max(currentLimit, PRO_STORAGE_LIMIT)
        : currentLimit + Number(claimedTxn.storage_added ?? 0);
      const newPlan = claimedTxn.plan === "pro" ? "pro" : profile.storage_plan;

      const { error: profileUpdateError } = await adminClient
        .from("profiles")
        .update({
          storage_limit: newLimit,
          storage_plan: newPlan,
        })
        .eq("id", claimedTxn.user_id);

      if (profileUpdateError) {
        await adminClient
          .from("transactions")
          .update({
            status: "failed",
            invoice_id: invoiceId,
            metadata: {
              ...verifyData,
              error: "profile_update_failed",
              details: profileUpdateError.message,
            },
          })
          .eq("id", claimedTxn.id);

        throw new Error(`Profile update failed: ${profileUpdateError.message}`);
      }
    }

    await adminClient
      .from("transactions")
      .update({
        status: "completed",
        invoice_id: invoiceId,
        transaction_id: gatewayTransactionId ?? claimedTxn.transaction_id,
        metadata: verifyData,
      })
      .eq("id", claimedTxn.id);

    if (profile.email) {
      await sendEmail(supabaseUrl, "payment_success", profile.email, {
        plan_name: PLAN_NAMES[claimedTxn.plan] || claimedTxn.plan,
        amount: Number(claimedTxn.amount),
        storage_added: formatBytes(Number(claimedTxn.storage_added ?? 0)),
        transaction_id: claimedTxn.id,
        date: new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" }),
      });
    }

    return await buildTransactionResponse(adminClient, claimedTxn.id, "completed");
  } catch (err) {
    console.error("Verify error:", err);
    return jsonResponse({ error: (err as Error).message }, 400);
  }
});
