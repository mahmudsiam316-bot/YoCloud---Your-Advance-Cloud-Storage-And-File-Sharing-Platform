import { useState } from "react";
import { Bell, Send, Users, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  users: any[];
}

export function AdminBulkNotification({ users }: Props) {
  const { user: currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = (users ?? []).filter((u: any) =>
    !searchQuery || u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUser = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const targetUsers = target === "all" ? (users ?? []) : (users ?? []).filter((u: any) => selectedIds.has(u.id));
      if (targetUsers.length === 0) {
        toast.error("No users selected");
        return;
      }
      const notifications = targetUsers.map((u: any) => ({
        user_id: u.id,
        title: title.trim(),
        message: message.trim(),
        type: "admin",
      }));

      // Insert in batches of 50
      for (let i = 0; i < notifications.length; i += 50) {
        const batch = notifications.slice(i, i + 50);
        const { error } = await supabase.from("notifications").insert(batch);
        if (error) throw error;
      }

      // Log admin action
      if (currentUser) {
        await supabase.from("admin_action_logs").insert({
          admin_id: currentUser.id,
          action: "bulk_notification",
          details: { title, target, count: targetUsers.length },
        });
      }

      toast.success(`Notification sent to ${targetUsers.length} users`);
      setTitle("");
      setMessage("");
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
          <Bell className="w-4.5 h-4.5 text-primary" />
          Bulk Notifications
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Send in-app notifications to all users or a selected group. Notifications appear in each user's notification bell and history page.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Use this for system announcements, maintenance alerts, feature updates, or policy changes. Messages are delivered instantly via real-time push.
        </p>
      </div>

      {/* Target selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recipients</label>
        <div className="flex gap-2">
          <button onClick={() => setTarget("all")}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors border",
              target === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}>
            <Users className="w-3.5 h-3.5" /> All Users ({users?.length ?? 0})
          </button>
          <button onClick={() => setTarget("selected")}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors border",
              target === "selected" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}>
            <UserCheck className="w-3.5 h-3.5" /> Selected ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* User picker for selected mode */}
      {target === "selected" && (
        <div className="space-y-2 p-3 bg-card border border-border rounded-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full h-8 px-3 bg-secondary/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {filteredUsers.map((u: any) => (
              <label key={u.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-secondary/40 cursor-pointer">
                <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleUser(u.id)} className="rounded" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">{u.display_name || u.email?.split("@")[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Message */}
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Notification Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. System Maintenance Notice"
            className="w-full h-10 px-3 mt-1.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Message Body</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your notification message here..."
            rows={4}
            className="w-full px-3 py-2.5 mt-1.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
          />
        </div>
      </div>

      <Button
        onClick={handleSend}
        disabled={sending || !title.trim() || !message.trim()}
        className="w-full sm:w-auto h-10 px-6 gap-2"
      >
        <Send className="w-4 h-4" />
        {sending ? "Sending..." : `Send to ${target === "all" ? `${users?.length ?? 0} users` : `${selectedIds.size} selected`}`}
      </Button>
    </div>
  );
}
