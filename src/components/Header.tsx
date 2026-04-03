import { useState, useCallback } from "react";
import { Search, HelpCircle, Settings, Menu, LogOut, LayoutDashboard, Shield, ScanLine } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useProfile } from "@/hooks/useRoles";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationBell } from "@/components/NotificationComponents";
import { QRScanner } from "@/components/QRScanner";
import { ScanResultDrawer } from "@/components/ScanResultDrawer";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";

interface HeaderProps {
  onMenuToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function getInitials(email: string): string {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

export function Header({ onMenuToggle, searchQuery, onSearchChange }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const isAdmin = useIsAdmin();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const email = user?.email ?? "";
  const initials = getInitials(email);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim().length >= 2) {
      navigate(`/workspace/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, navigate]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  }, [handleSearchSubmit]);

  const handleScanResult = (data: string) => {
    setScannerOpen(false);
    setScanResult(data);
    setDrawerOpen(true);
  };

  return (
    <>
      <header className="h-[60px] bg-card/80 backdrop-blur-sm border-b border-border/60 flex items-center px-2 md:px-6 shrink-0 sticky top-0 z-30">
        {/* Left: Workspace switcher + Menu toggle */}
        <div className="flex items-center gap-1 shrink-0 min-w-0 max-w-[140px] md:max-w-none">
          <button
            onClick={onMenuToggle}
            className="hidden md:flex w-9 h-9 rounded-lg hover:bg-secondary items-center justify-center transition-colors shrink-0"
          >
            <Menu className="w-[20px] h-[20px] text-muted-foreground" />
          </button>
          <WorkspaceSwitcher className="min-w-0" />
        </div>

        {/* Center: Search bar */}
        <div className="flex-1 flex justify-center px-2 md:px-4 min-w-0">
          <div className="w-full max-w-[560px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search files across workspaces..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-10 pl-10 pr-14 bg-secondary/50 rounded-full text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary/80 transition-all border-0"
            />
            <button
              onClick={handleSearchSubmit}
              className="hidden sm:flex absolute right-3.5 top-1/2 -translate-y-1/2 h-[22px] items-center gap-0.5 rounded-md bg-background/80 px-1.5 text-[10px] font-mono text-muted-foreground/60 border border-border/40 hover:bg-secondary transition-colors cursor-pointer"
            >
              ⌘K
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* QR Scanner - mobile only */}
          {isMobile && (
            <button
              onClick={() => setScannerOpen(true)}
              className="flex w-9 h-9 rounded-lg hover:bg-secondary items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
            >
              <ScanLine className="w-[20px] h-[20px]" />
            </button>
          )}
          <button className="hidden sm:flex w-9 h-9 rounded-lg hover:bg-secondary items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
            <HelpCircle className="w-[20px] h-[20px]" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="hidden sm:flex w-9 h-9 rounded-lg hover:bg-secondary items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-[20px] h-[20px]" />
          </button>
          <NotificationBell />

          {/* Profile */}
          <div className="ml-1.5 pl-2.5 border-l border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-secondary/70 py-1 pl-1 pr-1 lg:pr-3 transition-colors">
                  <Avatar className="w-8 h-8">
                    {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:block text-[13px] font-medium text-foreground truncate max-w-[140px]">{email}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground truncate">{email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 mr-2" /> Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* QR Scanner & Result Drawer - OUTSIDE header to avoid clipping */}
      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScanResult={handleScanResult} />
      <ScanResultDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} scannedData={scanResult} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
