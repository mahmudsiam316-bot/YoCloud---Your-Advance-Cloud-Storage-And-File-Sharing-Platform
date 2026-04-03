import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, Share2, MessageSquare, HardDrive, Info, ExternalLink, Pin, PinOff, Filter, Volume2, VolumeX, Shield, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead,
  useClearNotifications, useTogglePin, useBatchDeleteNotifications,
  useBatchMarkAsRead, type Notification
} from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const NOTIFICATION_TYPES = [
  { value: "all", label: "All", icon: Bell },
  { value: "share", label: "Share", icon: Share2 },
  { value: "comment", label: "Comment", icon: MessageSquare },
  { value: "storage", label: "Storage", icon: HardDrive },
  { value: "admin", label: "Admin", icon: Shield },
  { value: "info", label: "Info", icon: Info },
];

function getNotificationIcon(type: string) {
  switch (type) {
    case "share": return <Share2 className="w-4 h-4 text-primary" />;
    case "comment": return <MessageSquare className="w-4 h-4 text-blue-500" />;
    case "storage": return <HardDrive className="w-4 h-4 text-destructive" />;
    case "admin": return <Shield className="w-4 h-4 text-amber-500" />;
    default: return <Info className="w-4 h-4 text-muted-foreground" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function useDeepLink() {
  const navigate = useNavigate();
  return (n: Notification) => {
    if (n.related_file_id) {
      navigate(`/?file=${n.related_file_id}`);
    } else if (n.type === "share") {
      navigate("/");
    } else if (n.type === "comment") {
      navigate("/");
    } else if (n.type === "storage") {
      navigate("/upgrade");
    }
  };
}

// ───── Bell Dropdown (Header) ─────
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unreadCount = useUnreadCount();
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <NotificationList compact onClose={() => setOpen(false)} />
              <div className="border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => { setOpen(false); navigate("/notifications"); }}
                >
                  View all notifications <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───── Notification List (shared between bell & page) ─────
export function NotificationList({ compact, onClose, filter }: { compact?: boolean; onClose?: () => void; filter?: string }) {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const deepLink = useDeepLink();

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    deepLink(n);
    onClose?.();
  };

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  let items = notifications ?? [];
  if (filter && filter !== "all") {
    items = items.filter(n => n.type === filter);
  }

  // Pinned first, then by date
  items = [...items].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (compact) items = items.slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-y-auto", compact ? "max-h-72" : "")}>
      {items.map((n) => (
        <button
          key={n.id}
          onClick={() => handleClick(n)}
          className={cn(
            "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-0",
            !n.is_read && "bg-primary/5",
            n.is_pinned && "bg-amber-500/5"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
            {getNotificationIcon(n.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {n.is_pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
              <p className={cn("text-sm truncate", !n.is_read ? "font-semibold text-foreground" : "text-foreground")}>
                {n.title}
              </p>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
              {n.read_at && n.is_read && (
                <p className="text-[10px] text-muted-foreground/60">• Read {timeAgo(n.read_at)}</p>
              )}
            </div>
          </div>
          {!n.is_read && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
          )}
        </button>
      ))}
    </div>
  );
}

// ───── Full Page Content ─────
export function NotificationsPageContent() {
  const { data: notifications } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();
  const clearAll = useClearNotifications();
  const togglePin = useTogglePin();
  const batchDelete = useBatchDeleteNotifications();
  const batchRead = useBatchMarkAsRead();
  const unreadCount = useUnreadCount();
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    const filtered = (notifications ?? []).filter(n => filter === "all" || n.type === filter);
    setSelectedIds(new Set(filtered.map(n => n.id)));
  };

  const handleBatchRead = () => {
    if (selectedIds.size > 0) {
      batchRead.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBatchMode(false);
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size > 0) {
      batchDelete.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBatchMode(false);
    }
  };

  let items = notifications ?? [];
  if (filter !== "all") {
    items = items.filter(n => n.type === filter);
  }

  // Pinned first
  items = [...items].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        <div className="flex gap-1.5">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => markAllAsRead.mutate()} className="gap-1 text-xs h-8 px-2.5">
              <CheckCheck className="w-3.5 h-3.5" /> Read all
            </Button>
          )}
          <Button
            size="sm"
            variant={batchMode ? "default" : "outline"}
            onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            className="gap-1 text-xs h-8 px-2.5"
          >
            <Check className="w-3.5 h-3.5" /> Select
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        {NOTIFICATION_TYPES.map((t) => {
          const count = t.value === "all"
            ? (notifications?.length ?? 0)
            : (notifications?.filter(n => n.type === t.value).length ?? 0);
          return (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                filter === t.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  filter === t.value ? "bg-primary/20" : "bg-secondary"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Batch Actions Bar */}
      <AnimatePresence>
        {batchMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-center gap-2 p-2.5 bg-card border border-border rounded-xl">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Button size="sm" variant="ghost" onClick={selectAll} className="text-xs h-7 px-2">
                Select All
              </Button>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleBatchRead} disabled={selectedIds.size === 0} className="text-xs h-7 px-2 gap-1">
                <CheckCheck className="w-3 h-3" /> Read
              </Button>
              <Button size="sm" variant="outline" onClick={handleBatchDelete} disabled={selectedIds.size === 0} className="text-xs h-7 px-2 gap-1 text-destructive hover:text-destructive">
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground/60 mt-1">You're all caught up!</p>
          </div>
        ) : (
          items.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              batchMode={batchMode}
              isSelected={selectedIds.has(n.id)}
              onToggleSelect={() => toggleSelect(n.id)}
              onTogglePin={() => togglePin.mutate({ id: n.id, is_pinned: n.is_pinned })}
            />
          ))
        )}
      </div>

      {/* Clear All */}
      {(notifications?.length ?? 0) > 0 && (
        <div className="mt-4 text-center">
          <Button size="sm" variant="ghost" onClick={() => clearAll.mutate()} className="text-xs text-muted-foreground gap-1.5">
            <Trash2 className="w-3 h-3" /> Clear all notifications
          </Button>
        </div>
      )}
    </div>
  );
}

// ───── Individual Notification Item ─────
function NotificationItem({
  notification: n,
  batchMode,
  isSelected,
  onToggleSelect,
  onTogglePin,
}: {
  notification: Notification;
  batchMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onTogglePin: () => void;
}) {
  const markAsRead = useMarkAsRead();
  const deepLink = useDeepLink();
  const navigate = useNavigate();

  const handleClick = () => {
    if (batchMode) {
      onToggleSelect();
      return;
    }
    if (!n.is_read) markAsRead.mutate(n.id);
    deepLink(n);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border last:border-0",
        !n.is_read && "bg-primary/5",
        n.is_pinned && "bg-amber-500/5 border-l-2 border-l-amber-500",
        isSelected && "bg-primary/10"
      )}
    >
      {/* Batch checkbox */}
      {batchMode && (
        <div className="pt-1">
          <div className={cn(
            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
            isSelected ? "bg-primary border-primary" : "border-border"
          )}>
            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </div>
      )}

      {/* Icon */}
      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
        {getNotificationIcon(n.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {n.is_pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />}
          <p className={cn("text-sm truncate", !n.is_read ? "font-semibold text-foreground" : "text-foreground/80")}>
            {n.title}
          </p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
            n.type === "share" && "bg-primary/10 text-primary",
            n.type === "comment" && "bg-blue-500/10 text-blue-500",
            n.type === "storage" && "bg-destructive/10 text-destructive",
            n.type === "admin" && "bg-amber-500/10 text-amber-500",
            n.type === "info" && "bg-muted text-muted-foreground",
          )}>
            {n.type}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
          {n.read_at && n.is_read && (
            <span className="text-[10px] text-muted-foreground/50">• Read {timeAgo(n.read_at)}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary" />}
        {!batchMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {n.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
