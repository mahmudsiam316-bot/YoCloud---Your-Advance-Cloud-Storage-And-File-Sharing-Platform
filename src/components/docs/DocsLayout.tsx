import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Copy, Eye, EyeOff, BookOpen, Shield, Zap, Globe, Code, Terminal,
  FileText, FolderPlus, Share2, Tag, Menu, X, Layers, Rocket,
  CheckCircle2, Smartphone, User, HardDrive, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import nextjsIcon from "@/assets/nextjs-icon.png";
import reactIcon from "@/assets/react-icon.png";
import vueIcon from "@/assets/vue-icon.png";
import flutterIcon from "@/assets/flutter-icon.png";
import pythonIcon from "@/assets/python-icon.png";
import goIcon from "@/assets/go-icon.png";

export const LANGUAGES = [
  { id: "curl", label: "cURL", icon: Terminal },
  { id: "javascript", label: "JavaScript", icon: Code },
  { id: "python", label: "Python", icon: Code },
  { id: "php", label: "PHP", icon: Code },
  { id: "go", label: "Go", icon: Code },
];

export const SIDEBAR_SECTIONS = [
  { title: "Getting Started", icon: Rocket, items: [
    { id: "overview", label: "Overview", route: "/developer/docs" },
    { id: "authentication", label: "Authentication", route: "/developer/docs" },
    { id: "rate-limits", label: "Rate Limits", route: "/developer/docs" },
    { id: "errors", label: "Error Handling", route: "/developer/docs" },
    { id: "quickstart", label: "Quick Start Guide", route: "/developer/docs" },
  ]},
  { title: "Files", icon: FileText, items: [
    { id: "list-files", label: "List Files", route: "/developer/docs" },
    { id: "get-file", label: "Get File", route: "/developer/docs" },
    { id: "get-file-details", label: "File Full Details", route: "/developer/docs" },
    { id: "upload-file", label: "Upload File", route: "/developer/docs" },
    { id: "delete-file", label: "Delete File", route: "/developer/docs" },
  ]},
  { title: "User", icon: User, items: [
    { id: "get-me", label: "Current User", route: "/developer/docs" },
    { id: "get-user", label: "Get User by ID", route: "/developer/docs" },
  ]},
  { title: "Workspaces", icon: HardDrive, items: [
    { id: "list-workspaces", label: "List Workspaces", route: "/developer/docs" },
    { id: "get-workspace", label: "Workspace Details", route: "/developer/docs" },
    { id: "list-workspace-members", label: "Workspace Members", route: "/developer/docs" },
  ]},
  { title: "Folders", icon: FolderPlus, items: [
    { id: "create-folder", label: "Create Folder", route: "/developer/docs" },
  ]},
  { title: "Shares", icon: Share2, items: [
    { id: "list-shares", label: "List Shares", route: "/developer/docs" },
    { id: "create-share", label: "Create Share", route: "/developer/docs" },
  ]},
  { title: "Tags", icon: Tag, items: [
    { id: "list-tags", label: "List Tags", route: "/developer/docs" },
    { id: "create-tag", label: "Create Tag", route: "/developer/docs" },
  ]},
  { title: "AI Services", icon: Brain, items: [
    { id: "ai-analyze", label: "Image Analysis", route: "/developer/docs" },
  ]},
  { title: "Usage", icon: Zap, items: [
    { id: "get-usage", label: "Usage Stats", route: "/developer/docs" },
  ]},
  { title: "Webhooks", icon: Globe, items: [
    { id: "webhooks-guide", label: "Webhook Guide", route: "/developer/docs" },
  ]},
  { title: "Frameworks", icon: Layers, items: [
    { id: "nextjs-integration", label: "Next.js", route: "/developer/docs/nextjs", icon: nextjsIcon },
    { id: "react-integration", label: "React (Vite)", route: "/developer/docs/react", icon: reactIcon },
    { id: "vue-integration", label: "Vue.js", route: "/developer/docs/vue", icon: vueIcon },
    { id: "python-integration", label: "Python (Django/Flask)", route: "/developer/docs/python", icon: pythonIcon },
    { id: "go-integration", label: "Go (Gin/Fiber)", route: "/developer/docs/go", icon: goIcon },
    { id: "flutter-integration", label: "Flutter", route: "/developer/docs/flutter", icon: flutterIcon },
  ]},
];

// Code Block component
export function CodeBlock({ code, lang, showApiKey, onToggleKey, hasKey, baseUrl, apiKey, rawKeyAvailable }: {
  code: string;
  lang: string;
  showApiKey: boolean;
  onToggleKey: () => void;
  hasKey: boolean;
  baseUrl?: string;
  apiKey?: string;
  rawKeyAvailable?: boolean;
}) {
  const maskedKey = "yoc_••••••••••••••••••••••••••••••••••••••••••••••••";
  const hasRawKey = !!rawKeyAvailable;
  const displayKey = showApiKey && hasRawKey && apiKey ? apiKey : maskedKey;
  const processed = code
    .replace(/\{\{BASE_URL\}\}/g, baseUrl || "https://your-project.supabase.co/functions/v1/public-api")
    .replace(/\{\{API_KEY\}\}/g, displayKey);

  return (
    <div className="relative group rounded-xl border border-border bg-card overflow-hidden w-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-secondary/20">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">{lang}</span>
        <div className="flex items-center gap-1">
          {hasKey && (
            <button
              onClick={() => {
                if (!hasRawKey) {
                  toast.info("Full key only available in the session where it was created. Go to Developer Console → API Keys to create a new one.");
                  return;
                }
                onToggleKey();
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title={showApiKey ? "Hide API key" : hasRawKey ? "Show API key" : "Key not available — create a new key"}
            >
              {showApiKey && hasRawKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => { navigator.clipboard.writeText(processed); toast.success("Copied!"); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto w-full">
        <pre className="p-3 text-[11px] font-mono text-foreground whitespace-pre leading-relaxed min-w-0">
          {processed}
        </pre>
      </div>
    </div>
  );
}

interface DocsLayoutProps {
  children: React.ReactNode;
  sectionIds: string[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export default function DocsLayout({ children, sectionIds, activeSection, onSectionChange }: DocsLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: apiKeys } = useApiKeys();
  const [selectedLang, setSelectedLang] = useState("javascript");
  const [showApiKey, setShowApiKey] = useState(false);
  const [search, setSearch] = useState("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const activeKey = apiKeys?.find(k => k.is_active);
  // Store raw key in sessionStorage when created, retrieve here for display
  const storedRawKey = typeof window !== 'undefined' ? sessionStorage.getItem('yocloud_last_api_key') : null;
  const apiKeyDisplay = storedRawKey || (activeKey ? `${activeKey.key_prefix}${"•".repeat(44)}` : "yoc_your_api_key_here");
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-api`;

  const currentIdx = sectionIds.indexOf(activeSection);
  const progressPercent = sectionIds.length > 1 ? Math.round((Math.max(0, currentIdx) / (sectionIds.length - 1)) * 100) : 0;

  const scrollTo = (id: string, route?: string) => {
    if (route && route !== location.pathname) {
      navigate(route);
      return;
    }
    onSectionChange(id);
    setShowMobileSidebar(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const isCurrentRoute = (route: string) => location.pathname === route;

  const SidebarNav = () => (
    <div className="space-y-1">
      <div className="mb-3 px-1">
        <Input placeholder="Search docs..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
      </div>
      {SIDEBAR_SECTIONS.map(section => {
        const filteredItems = section.items.filter(item => !search || item.label.toLowerCase().includes(search.toLowerCase()));
        if (!filteredItems.length) return null;
        return (
          <div key={section.title} className="mb-2">
            <div className="flex items-center gap-1.5 px-2 mb-1">
              <section.icon className="w-3 h-3 text-muted-foreground" />
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{section.title}</p>
            </div>
            {filteredItems.map(item => {
              const itemRoute = (item as any).route || "/developer/docs";
              const itemIcon = (item as any).icon;
              const isActive = isCurrentRoute(itemRoute) && (itemRoute !== "/developer/docs" || activeSection === item.id);
              const isFrameworkLink = itemRoute !== "/developer/docs";

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isFrameworkLink) {
                      navigate(itemRoute);
                      setShowMobileSidebar(false);
                    } else {
                      scrollTo(item.id, itemRoute);
                    }
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                      : isCurrentRoute(itemRoute) && isFrameworkLink
                      ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {itemIcon && (
                    <img src={itemIcon} alt="" className="w-3.5 h-3.5 rounded-sm" />
                  )}
                  {item.label}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  const ProgressPanel = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progress</span>
          <span className="text-[10px] font-bold text-primary">{progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
        <div className="space-y-0.5">
          {sectionIds.map((id, idx) => {
            const isVisited = idx <= currentIdx;
            const isCurrent = id === activeSection;
            const label = SIDEBAR_SECTIONS.flatMap(s => s.items).find(i => i.id === id)?.label || id.replace(/-/g, " ");
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-[10px] flex items-center gap-1.5 transition-all",
                  isCurrent ? "text-primary font-semibold bg-primary/5" :
                  isVisited ? "text-foreground/60" : "text-muted-foreground/40"
                )}
              >
                {isVisited ? (
                  <CheckCircle2 className={cn("w-3 h-3 shrink-0", isCurrent ? "text-primary" : "text-emerald-500/60")} />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-border shrink-0" />
                )}
                <span className="truncate capitalize">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-2.5 rounded-xl border border-border bg-secondary/20">
        <p className="text-[10px] font-bold text-muted-foreground mb-1">API Version</p>
        <p className="text-xs font-semibold text-foreground">REST API v1</p>
        <p className="text-[10px] font-bold text-muted-foreground mt-2 mb-1">Base URL</p>
        <p className="text-[10px] font-mono text-foreground break-all">{baseUrl}</p>
        <p className="text-[10px] font-bold text-muted-foreground mt-2 mb-1">Rate Limit</p>
        <p className="text-xs font-semibold text-foreground">100 req/min</p>
      </div>
    </div>
  );

  const headerHeight = isMobile ? 48 : 56;
  const switcherHeight = isMobile ? 44 : 48;
  const totalStickyHeight = headerHeight + switcherHeight;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border/40">
        <div className="max-w-[1400px] mx-auto px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-3 h-12 md:h-14">
            <button onClick={() => navigate("/developer")} className="p-1.5 rounded-lg hover:bg-secondary">
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>
            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h1 className="font-bold text-foreground text-sm md:text-lg truncate">API Documentation</h1>
            <div className="flex-1" />
            <Badge variant="outline" className="text-[9px] md:text-[10px]">v1</Badge>
            {isMobile && (
              <Button size="sm" variant="ghost" onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="p-1.5 h-8 w-8">
                {showMobileSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Code Switcher Bar - fixed below header */}
      <div className="fixed left-0 right-0 z-40 bg-background border-b border-border/40" style={{ top: headerHeight }}>
        <div className="max-w-[1400px] mx-auto px-3 md:px-6">
          <div className="flex items-center gap-2 py-2 md:py-2.5">
            <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5 overflow-x-auto scrollbar-hide">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLang(lang.id)}
                  className={cn(
                    "px-1.5 md:px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-semibold transition-all whitespace-nowrap",
                    selectedLang === lang.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {activeKey && (
              <div className="flex items-center gap-1.5 text-[9px] md:text-[10px]">
                <code className="font-mono bg-card px-1.5 py-0.5 rounded border border-border text-foreground truncate max-w-[120px] md:max-w-none">
                  {showApiKey ? `${activeKey.key_prefix}••••••••` : `${activeKey.key_prefix}••••`}
                </code>
                <button onClick={() => setShowApiKey(!showApiKey)} className="text-muted-foreground hover:text-foreground">
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
            {!activeKey && (
              <Button size="sm" variant="outline" className="text-[9px] md:text-[10px] h-6 md:h-7" onClick={() => navigate("/developer")}>
                Create API Key
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for fixed header + switcher */}
      <div style={{ height: totalStickyHeight }} className="shrink-0" />

      {/* Body with sidebars */}
      <div className="max-w-[1400px] mx-auto flex flex-1 w-full relative">
        {/* Left Sidebar - Desktop, sticky */}
        {!isMobile && (
          <div
            className="w-52 shrink-0 border-r border-border/30 overflow-y-auto py-4 px-2 scrollbar-hide sticky"
            style={{ top: totalStickyHeight, height: `calc(100vh - ${totalStickyHeight}px)` }}
          >
            <SidebarNav />
          </div>
        )}

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {isMobile && showMobileSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
                onClick={() => setShowMobileSidebar(false)}
              />
              <motion.div
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border shadow-xl px-3 overflow-y-auto"
                style={{ paddingTop: totalStickyHeight + 8 }}
              >
                <SidebarNav />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 min-w-0 px-3 md:px-8 pb-4 overflow-hidden">
          <div className="docs-scroll-content space-y-6 md:space-y-8 pt-4 md:pt-6">
            <DocsContext.Provider value={{ selectedLang, showApiKey, setShowApiKey, activeKey, apiKeyDisplay, baseUrl, rawKeyAvailable: !!storedRawKey }}>
              {children}
            </DocsContext.Provider>
          </div>
          <div className="h-20 md:h-24" />
        </div>

        {/* Right Sidebar - Desktop, sticky */}
        {!isMobile && (
          <div
            className="w-48 shrink-0 border-l border-border/30 overflow-y-auto py-4 px-3 scrollbar-hide sticky"
            style={{ top: totalStickyHeight, height: `calc(100vh - ${totalStickyHeight}px)` }}
          >
            <ProgressPanel />
          </div>
        )}
      </div>

      {/* Mobile: Bottom progress bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/40 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground">Progress</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[10px] font-bold text-primary">{progressPercent}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Context for passing docs state to children
import { createContext, useContext } from "react";

interface DocsContextType {
  selectedLang: string;
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;
  activeKey: any;
  apiKeyDisplay: string;
  baseUrl: string;
  rawKeyAvailable: boolean;
}

export const DocsContext = createContext<DocsContextType>({
  selectedLang: "javascript",
  showApiKey: false,
  setShowApiKey: () => {},
  activeKey: null,
  apiKeyDisplay: "",
  baseUrl: "",
  rawKeyAvailable: false,
});

export function useDocsContext() {
  return useContext(DocsContext);
}
