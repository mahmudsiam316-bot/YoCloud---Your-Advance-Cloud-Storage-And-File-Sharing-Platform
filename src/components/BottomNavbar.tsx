import { Home, FolderOpen, ImageIcon, LayoutGrid, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavbarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  onUploadClick: () => void;
}

const tabs = [
  { id: "my-storage", label: "Home", icon: Home },
  { id: "recents", label: "Files", icon: FolderOpen },
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "menu", label: "Menu", icon: LayoutGrid },
];

export function BottomNavbar({ activeItem, onItemClick, onUploadClick }: BottomNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (id: string) => {
    if (id === "menu") {
      if (location.pathname !== "/menu") navigate("/menu");
      onItemClick(id);
      return;
    }
    if (location.pathname !== "/") {
      navigate("/");
    }
    onItemClick(id);
  };

  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {/* Gradient fade above navbar */}
      <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <nav className="relative bg-card/90 backdrop-blur-xl border-t border-border/40 px-3 pb-safe pt-1.5">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Left tabs */}
          {leftTabs.map((tab) => {
            const active = activeItem === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleClick(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all relative min-w-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "relative p-1.5 rounded-xl transition-all",
                  active && "bg-primary/10"
                )}>
                  <tab.icon className={cn("w-5 h-5 transition-all", active && "stroke-[2.5px]")} />
                </div>
                <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
                {active && (
                  <motion.div
                    layoutId="bottomnav-dot"
                    className="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          {/* Center FAB */}
          <div className="relative flex items-center justify-center -mt-6">
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              onClick={onUploadClick}
              className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center ring-4 ring-card/90"
            >
              <Plus className="w-7 h-7 stroke-[2.5px]" />
            </motion.button>
          </div>

          {/* Right tabs */}
          {rightTabs.map((tab) => {
            const active = activeItem === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleClick(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all relative min-w-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "relative p-1.5 rounded-xl transition-all",
                  active && "bg-primary/10"
                )}>
                  <tab.icon className={cn("w-5 h-5 transition-all", active && "stroke-[2.5px]")} />
                </div>
                <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
                {active && (
                  <motion.div
                    layoutId="bottomnav-dot"
                    className="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
