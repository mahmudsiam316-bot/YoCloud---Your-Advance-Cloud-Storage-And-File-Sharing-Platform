import { FileIcon, ImageIcon, Clock, Star, Trash2, HardDrive, X, Activity, LayoutDashboard, Shield, Sparkles, Store, Code, Settings2, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useRoles";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

const navItems = [
  { id: "my-storage", label: "My storage", icon: HardDrive },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "recents", label: "Recents", icon: Clock },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "trash", label: "Trash", icon: Trash2, route: "/trash" },
];

function formatGB(bytes: number): string {
  if (bytes < 1e6) return "0";
  return (bytes / 1e9).toFixed(1);
}

export function AppSidebar({ activeItem, onItemClick, isOpen, onToggle, storageUsedBytes, storageLimitBytes }: SidebarProps) {
  const storagePercent = Math.min((storageUsedBytes / storageLimitBytes) * 100, 100);
  const isNearLimit = storagePercent > 80;
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-5 shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <FileIcon className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-lg text-foreground">YoCloud</span>
      </div>

      <nav className="flex-1 px-3 mt-2 space-y-0.5 overflow-y-auto min-h-0" style={{ scrollbarWidth: "thin" }}>
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              if ((item as any).route) {
                navigate((item as any).route);
              } else {
                onItemClick(item.id);
              }
              if (window.innerWidth < 768) onToggle();
            }}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mobile-touch md:min-h-0",
              activeItem === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <span>{item.label}</span>
          </motion.button>
        ))}

        <div className="mt-4 pt-4 border-t border-border space-y-0.5">
          <motion.button whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
            onClick={() => { navigate("/marketplace"); if (window.innerWidth < 768) onToggle(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mobile-touch md:min-h-0">
            <Store className="w-[18px] h-[18px] shrink-0" /><span>Marketplace</span>
          </motion.button>
          <motion.button whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
            onClick={() => { navigate("/dashboard"); if (window.innerWidth < 768) onToggle(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mobile-touch md:min-h-0">
            <LayoutDashboard className="w-[18px] h-[18px] shrink-0" /><span>Dashboard</span>
          </motion.button>
          <motion.button whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
            onClick={() => { navigate("/developer"); if (window.innerWidth < 768) onToggle(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mobile-touch md:min-h-0">
            <Code className="w-[18px] h-[18px] shrink-0" /><span>Developer API</span>
          </motion.button>
          <motion.button whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
            onClick={() => { navigate("/workspace"); if (window.innerWidth < 768) onToggle(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mobile-touch md:min-h-0">
            <Settings2 className="w-[18px] h-[18px] shrink-0" /><span>Workspace Settings</span>
          </motion.button>
          <motion.button whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
            onClick={() => { navigate("/docs/features"); if (window.innerWidth < 768) onToggle(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mobile-touch md:min-h-0">
            <BookOpen className="w-[18px] h-[18px] shrink-0" /><span>Feature Docs</span>
          </motion.button>
          {isAdmin && (
            <motion.button whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
              onClick={() => { navigate("/admin"); if (window.innerWidth < 768) onToggle(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mobile-touch md:min-h-0">
              <Shield className="w-[18px] h-[18px] shrink-0" /><span>Admin</span>
            </motion.button>
          )}
        </div>
      </nav>

      {/* Storage widget - Glassmorphism floating card */}
      <div className="mx-3 mb-4 shrink-0">
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 backdrop-blur-sm shadow-lg shadow-primary/5 overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-primary/15 rounded-full blur-xl" />
          <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-primary/10 rounded-full blur-lg" />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Storage</p>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isNearLimit ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              )}>
                {Math.round(storagePercent)}%
              </span>
            </div>

            {/* Progress bar - thin & smooth */}
            <div className="w-full h-2 bg-secondary/60 rounded-full overflow-hidden mb-2.5">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isNearLimit
                    ? "bg-gradient-to-r from-destructive/80 to-destructive"
                    : "bg-gradient-to-r from-primary/70 to-primary"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${storagePercent}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatGB(storageUsedBytes)}</span>
              {" / "}
              <span>{formatGB(storageLimitBytes)} GB</span>
              {" used"}
            </p>

            {isNearLimit && (
              <p className="text-[10px] text-destructive mt-1.5 font-medium">⚠ Storage almost full</p>
            )}

            <button
              onClick={() => navigate("/upgrade")}
              className="mt-3 w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/50 z-40 md:hidden"
              onClick={onToggle}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed left-0 top-0 w-[280px] h-screen bg-sidebar z-50 md:hidden shadow-xl"
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
