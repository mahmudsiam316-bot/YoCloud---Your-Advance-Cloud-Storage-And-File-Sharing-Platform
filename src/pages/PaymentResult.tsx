import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_PLANS, useVerifyPayment, type VerifyPaymentResponse } from "@/hooks/usePayment";

function formatStorage(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const txnId = searchParams.get("txn") ?? undefined;
  const invoiceId = searchParams.get("invoice_id") ?? undefined;
  const isSuccessPage = window.location.pathname.includes("/payment/success");
  const verifyPayment = useVerifyPayment();
  const [status, setStatus] = useState<"verifying" | "completed" | "failed">("verifying");
  const [retryCount, setRetryCount] = useState(0);
  const [result, setResult] = useState<VerifyPaymentResponse | null>(null);
  const maxRetries = 4;
  const hasStarted = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (!isSuccessPage) {
      setStatus("failed");
      return;
    }

    if (!txnId && !invoiceId) {
      setStatus("failed");
      return;
    }

    doVerify({ txnId, invoiceId }, 0);

    return () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [invoiceId, isSuccessPage, txnId]);

  const doVerify = ({ txnId, invoiceId }: { txnId?: string; invoiceId?: string }, attempt: number) => {
    verifyPayment.mutate(
      { txnId, invoiceId },
      {
        onSuccess: (data) => {
          if (data.status === "completed" || data.already_processed) {
            setResult(data);
            setStatus("completed");
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            return;
          }

          if (data.status === "pending" && attempt < maxRetries) {
            retryTimeoutRef.current = window.setTimeout(() => {
              setRetryCount(attempt + 1);
              doVerify({ txnId, invoiceId }, attempt + 1);
            }, 2500);
            return;
          }

          setStatus("failed");
        },
        onError: () => {
          if (attempt < maxRetries) {
            retryTimeoutRef.current = window.setTimeout(() => {
              setRetryCount(attempt + 1);
              doVerify({ txnId, invoiceId }, attempt + 1);
            }, 2500);
          } else {
            setStatus("failed");
          }
        },
      }
    );
  };

  const purchasedPlan = result?.transaction?.plan
    ? PAYMENT_PLANS.find((plan) => plan.id === result.transaction?.plan)?.name ?? result.transaction.plan
    : null;
  const currentPlan = result?.profile?.storage_plan
    ? `${result.profile.storage_plan.charAt(0).toUpperCase()}${result.profile.storage_plan.slice(1)}`
    : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        {status === "verifying" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground mb-2">Verifying Payment...</h1>
            <p className="text-sm text-muted-foreground">
              {retryCount > 0
                ? `Checking payment status (attempt ${retryCount + 1}/${maxRetries + 1})...`
                : "Please wait while we confirm your payment with the gateway."}
            </p>
          </>
        ) : status === "completed" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground mb-2">Payment Verified</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your payment was confirmed and your storage has been updated successfully.
            </p>

            {(purchasedPlan || result?.profile) && (
              <div className="rounded-2xl border border-border bg-card text-card-foreground p-4 mb-6 space-y-3 text-left">
                {purchasedPlan && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Purchased</span>
                    <span className="text-sm font-medium text-foreground">{purchasedPlan}</span>
                  </div>
                )}
                {currentPlan && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Current plan</span>
                    <span className="text-sm font-medium text-foreground">{currentPlan}</span>
                  </div>
                )}
                {result?.profile?.storage_limit != null && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Total storage</span>
                    <span className="text-sm font-medium text-foreground">{formatStorage(result.profile.storage_limit)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button className="w-full" onClick={() => navigate("/")}>
                Go to My Storage
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                View Dashboard
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground mb-2">Payment Verification Failed</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We could not confirm this payment with the gateway, so your plan and storage were not changed.
            </p>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => navigate("/upgrade")}>
                Try Again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Storage
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
