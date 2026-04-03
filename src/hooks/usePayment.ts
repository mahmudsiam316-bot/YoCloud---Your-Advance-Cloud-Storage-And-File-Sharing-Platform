import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  storageGB: number;
}

export interface VerifyPaymentResponse {
  status: string;
  transaction_id: string;
  invoice_id?: string | null;
  already_processed?: boolean;
  transaction?: {
    plan: string;
    amount: number;
    currency: string;
  } | null;
  profile?: {
    storage_plan: string;
    storage_limit: number;
  } | null;
}

export const PAYMENT_PLANS: PaymentPlan[] = [
  { id: "pro", name: "Pro Plan", description: "Upgrade to 10GB storage", amount: 299, currency: "BDT", storageGB: 10 },
  { id: "add-5gb", name: "+5GB Storage", description: "Add 5GB to your current plan", amount: 149, currency: "BDT", storageGB: 5 },
  { id: "add-10gb", name: "+10GB Storage", description: "Add 10GB to your current plan", amount: 249, currency: "BDT", storageGB: 10 },
];

export const API_PLANS = [
  { id: "free", name: "Free", amount: 0, rpm: 3, features: ["3 requests/min", "Basic endpoints", "Community support"] },
  { id: "api-pro", name: "Pro", amount: 900, rpm: 9, features: ["9 requests/min", "All endpoints", "Priority support", "Webhook events"] },
  { id: "api-enterprise", name: "Enterprise", amount: 30000, rpm: -1, features: ["Unlimited requests", "All endpoints", "Dedicated support", "Custom webhooks", "SLA guarantee"] },
];

export function useInitPayment() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error("Not authenticated");

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("No session");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/uddoktapay-init`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ planId }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Payment initialization failed");
      }

      return await res.json() as { payment_url: string; transaction_id: string };
    },
  });
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: async ({ txnId, invoiceId }: { txnId?: string; invoiceId?: string }) => {
      if (!txnId && !invoiceId) {
        throw new Error("Missing payment reference");
      }

      const session = (await supabase.auth.getSession()).data.session;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/uddoktapay-verify`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...(txnId ? { txnId } : {}),
            ...(invoiceId ? { invoice_id: invoiceId } : {}),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(async () => ({ error: await res.text() }));
        throw new Error(err.error || "Verification failed");
      }

      return await res.json() as VerifyPaymentResponse;
    },
  });
}
