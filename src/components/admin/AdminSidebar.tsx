import { LayoutDashboard, Users, FileIcon, Activity, ScrollText, Settings, CreditCard, Shield, Ban, Bell, Trash2, BarChart3, ArrowLeft, X, Store, Globe, TrendingUp, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export type AdminTabId = "overview" | "users" | "files" | "activity" | "logs" | "config" | "transactions" | "storage" | "cleanup" | "notifications" | "plans" | "marketplace" | "workspaces" | "charts" | "api";

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onTabChange: (tab: AdminTabId) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const navSections = [
  {
    label: "Dashboard",
    items: [
      { id: "overview" as AdminTabId, label: "Overview", icon: LayoutDashboard, description: "System summary & health" },
      { id: "charts" as AdminTabId, label: "Charts", icon: TrendingUp, description: "Signups, uploads, active users" },
    ],
  },
  {
    label: "User Management",
    items: [
      { id: "users" as AdminTabId, label: "Users", icon: Users, description: "Search, filter, ban/suspend" },
      { id: "plans" as AdminTabId, label: "Plan Upgrade", icon: Crown, description: "Manual plan & storage change" },
      { id: "notifications" as AdminTabId, label: "Notifications", icon: Bell, description: "Bulk email & alerts" },
    ],
  },
  {
    label: "Content & Files",
    items: [
      { id: "files" as AdminTabId, label: "Files", icon: FileIcon, description: "Browse & manage all files" },
      { id: "cleanup" as AdminTabId, label: "Cleanup", icon: Trash2, description: "Orphaned & trashed files" },
      { id: "storage" as AdminTabId, label: "Storage", icon: BarChart3, description: "Per-user analytics" },
      { id: "marketplace" as AdminTabId, label: "Marketplace", icon: Store, description: "Moderate listings & content" },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "workspaces" as AdminTabId, label: "Workspaces", icon: Globe, description: "All workspaces & ownership" },
      { id: "activity" as AdminTabId, label: "Activity", icon: Activity, description: "Platform-wide timeline" },
      { id: "logs" as AdminTabId, label: "Audit Logs", icon: ScrollText, description: "Admin action trail" },
      { id: "config" as AdminTabId, label: "Config", icon: Settings, description: "System settings" },
      { id: "transactions" as AdminTabId, label: "Payments", icon: CreditCard, description: "Transaction history" },
      { id: "api" as AdminTabId, label: "API System", icon: Shield, description: "Keys, subscriptions, analytics" },
    ],
  },
];

export function AdminSidebar({ activeTab, onTabChange, isOpen, onToggle }: AdminSidebarProps) {
  const navigate = useNavigate();

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <span className="font-display font-bold text-sm text-foreground">YoCloud Admin</span>
            <p className="text-[10px] text-muted-foreground leading-tight">System Control Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-3 space-y-4 overflow-y-auto min-h-0" style={{ scrollbarWidth: "thin" }}>
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    onTabChange(item.id);
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={cn(
                    "flex items-start gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium block">{item.label}</span>
                    <span className={cn(
                      "text-[10px] leading-tight block",
                      activeTab === item.id ? "text-primary-foreground/70" : "text-muted-foreground/70"
                    )}>{item.description}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Back to app */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to YoCloud</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
              onClick={onToggle}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed left-0 top-0 w-[280px] h-screen bg-sidebar z-50 lg:hidden shadow-xl"
            >
              <button onClick={onToggle} className="absolute top-4 right-4 p-1 rounded-md hover:bg-secondary">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
