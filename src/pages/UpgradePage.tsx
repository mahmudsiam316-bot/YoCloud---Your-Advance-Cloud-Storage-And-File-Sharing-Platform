import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, HardDrive, Plus, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_PLANS, useInitPayment, type PaymentPlan } from "@/hooks/usePayment";
import { useProfile } from "@/hooks/useRoles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(0)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function UpgradePage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const initPayment = useInitPayment();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const currentLimit = profile?.storage_limit ?? 5368709120;
  const currentPlan = profile?.storage_plan ?? "free";

  const handleUpgrade = async (plan: PaymentPlan) => {
    setSelectedPlan(plan.id);
    try {
      const result = await initPayment.mutateAsync(plan.id);
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (err: any) {
      toast.error(err.message || "Payment failed to initialize");
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border px-4 md:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-foreground">Upgrade Storage</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Current plan info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-6 text-center"
        >
          <HardDrive className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-lg font-display font-bold text-foreground mb-1">Current Plan</h2>
          <p className="text-sm text-muted-foreground capitalize">{currentPlan} · {formatSize(currentLimit)}</p>
        </motion.div>

        {/* Plan Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {PAYMENT_PLANS.map((plan, i) => {
            const isLoading = selectedPlan === plan.id && initPayment.isPending;
            const isPro = plan.id === "pro";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative bg-card border rounded-xl p-6 flex flex-col",
                  isPro ? "border-primary ring-2 ring-primary/20" : "border-border"
                )}
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  {isPro ? <Zap className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                  <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <div className="mt-auto">
                  <p className="text-2xl font-display font-bold text-foreground mb-1">
                    ৳{plan.amount}
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-4">{plan.storageGB}GB storage</p>
                  <Button
                    className="w-full"
                    variant={isPro ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan)}
                    disabled={initPayment.isPending}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                    ) : (
                      <><CreditCard className="w-4 h-4 mr-2" /> Pay ৳{plan.amount}</>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Payment info */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Payments processed securely via UddoktaPay (BDT)</p>
          <p>bKash, Nagad, Rocket, and card payments supported</p>
        </div>
      </main>
    </div>
  );
}
