import { useState } from "react";
import { Crown, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  users: any[];
  userStorageMap: Record<string, number>;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

const plans = [
  { id: "free", label: "Free", storage: 5, color: "bg-secondary text-muted-foreground" },
  { id: "premium", label: "Premium", storage: 10, color: "bg-chart-3/10 text-chart-3" },
];

export function AdminPlanUpgrade({ users, userStorageMap }: Props) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [customStorage, setCustomStorage] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredUsers = (users ?? []).filter((u: any) =>
    !searchQuery || u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpgrade = async (userId: string) => {
    setSaving(true);
    try {
      const updates: any = {};
      if (selectedPlan) updates.storage_plan = selectedPlan;
      if (customStorage) {
        const gb = parseFloat(customStorage);
        if (isNaN(gb) || gb <= 0) throw new Error("Invalid storage value");
        updates.storage_limit = Math.round(gb * 1e9);
      }
      if (Object.keys(updates).length === 0) {
        toast.error("No changes to apply");
        return;
      }
      const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
      if (error) throw error;

      if (currentUser) {
        await supabase.from("admin_action_logs").insert({
          admin_id: currentUser.id,
          action: "manual_plan_upgrade",
          target_user_id: userId,
          details: updates,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("Plan updated successfully");
      setEditingUser(null);
      setSelectedPlan("");
      setCustomStorage("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Crown className="w-4.5 h-4.5 text-chart-3" />
          Manual Plan Upgrade
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manually upgrade or downgrade a user's subscription plan and storage quota.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Use this for special cases like gifting premium access, correcting billing issues, or providing custom storage quotas.
          All changes are logged in the audit trail. Plan changes take effect immediately — the user's storage limit updates in real-time.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search user by name or email..."
          className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
      </div>

      <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {filteredUsers.map((u: any) => {
          const isEditing = editingUser === u.id;
          return (
            <div key={u.id} className={cn("rounded-xl border transition-colors", isEditing ? "border-primary/30 bg-primary/5" : "border-border/50 bg-card")}>
              <div className="p-3.5 flex items-center justify-between gap-3 cursor-pointer" onClick={() => setEditingUser(isEditing ? null : u.id)}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{u.display_name || "Unnamed"}</p>
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                      u.storage_plan === "premium" ? "bg-chart-3/10 text-chart-3" : "bg-secondary text-muted-foreground"
                    )}>{u.storage_plan}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Using {formatSize(userStorageMap[u.id] || 0)} of {formatSize(u.storage_limit)}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 shrink-0">
                  {isEditing ? "Close" : "Edit"}
                </Button>
              </div>

              {isEditing && (
                <div className="px-3.5 pb-3.5 border-t border-border/30 pt-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Change Plan</label>
                    <p className="text-[10px] text-muted-foreground/70 mb-2">Select a plan tier. This changes the plan label and sets the default storage limit for that tier.</p>
                    <div className="flex gap-2">
                      {plans.map((p) => (
                        <button key={p.id} onClick={() => { setSelectedPlan(p.id); setCustomStorage(String(p.storage)); }}
                          className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                            selectedPlan === p.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
                          )}>
                          {p.label} ({p.storage} GB)
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Storage (GB)</label>
                    <p className="text-[10px] text-muted-foreground/70 mb-2">Override with a custom value. Leave empty to use the plan default.</p>
                    <input type="number" value={customStorage} onChange={(e) => setCustomStorage(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full max-w-xs h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring/30" />
                  </div>

                  <Button onClick={() => handleUpgrade(u.id)} disabled={saving} className="h-9 px-4 gap-1.5 text-xs">
                    <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Apply Changes"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
