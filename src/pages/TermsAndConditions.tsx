import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";
import { useIsMobile } from "@/hooks/use-mobile";
import { TERMS_SECTIONS } from "@/data/termsContent";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, ChevronDown, ChevronRight, Search, Shield, ScrollText, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TermsAndConditions() {
  const { user } = useAuth();
  const { acceptTerms, currentVersion } = useTermsAcceptance();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolledEnough, setScrolledEnough] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState(TERMS_SECTIONS[0].id);

  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight <= 0) {
      setScrollProgress(100);
      setScrolledEnough(true);
      return;
    }
    const pct = Math.min(100, (scrollTop / scrollHeight) * 100);
    setScrollProgress(pct);
    if (pct >= 80) setScrolledEnough(true);

    // Detect active section
    for (let i = TERMS_SECTIONS.length - 1; i >= 0; i--) {
      const ref = sectionRefs.current[TERMS_SECTIONS[i].id];
      if (ref && ref.offsetTop - el.offsetTop <= scrollTop + 100) {
        setActiveSection(TERMS_SECTIONS[i].id);
        break;
      }
    }
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial state
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const ref = sectionRefs.current[id];
    if (ref && contentRef.current) {
      const top = ref.offsetTop - contentRef.current.offsetTop;
      contentRef.current.scrollTo({ top, behavior: "smooth" });
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContinue = () => {
    if (!agreed) {
      toast.error("You must agree to the Terms & Conditions");
      return;
    }
    if (!scrolledEnough) {
      toast.error("Please scroll through the terms before accepting");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmAccept = async () => {
    setSaving(true);
    try {
      await acceptTerms.mutateAsync(scrolledEnough);
      toast.success("Terms accepted! Welcome to YoCloud 🎉");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to save acceptance");
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const filteredSections = searchQuery
    ? TERMS_SECTIONS.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : TERMS_SECTIONS;

  const canContinue = agreed && scrolledEnough;

  // Bottom bar height for padding
  const bottomBarH = "72px";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top progress */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Progress value={scrollProgress} className="h-1 rounded-none" />
      </div>

      {/* Header */}
      <div className="border-b border-border bg-background shrink-0 pt-1">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Terms & Conditions</h1>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              v{currentVersion}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
              {Math.round(scrollProgress)}% read
            </div>
            {scrolledEnough && (
              <span className="text-xs text-green-500">✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile section jump */}
      {isMobile && (
        <div className="px-4 py-2 border-b border-border flex gap-2 shrink-0">
          <Select value={activeSection} onValueChange={scrollToSection}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Jump to section" />
            </SelectTrigger>
            <SelectContent>
              {TERMS_SECTIONS.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-sm">
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-sm w-28"
            />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex max-w-6xl mx-auto w-full min-h-0">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <aside className="w-64 shrink-0 border-r border-border p-4 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Sections
            </p>
            <nav className="space-y-1">
              {TERMS_SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    activeSection === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {s.title}
                </button>
              ))}
            </nav>
            <div className="mt-6 pt-4 border-t border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>
          </aside>
        )}

        {/* Scrollable terms content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto min-h-0"
          style={{ paddingBottom: bottomBarH }}
        >
          <div className="px-4 md:px-8 py-6">
            {/* Intro banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30 mb-6">
              <ScrollText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Please read these terms carefully
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You must scroll through and agree to all terms before using YoCloud.
                  These terms protect both you and our platform.
                </p>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {filteredSections.map(section => (
                <div
                  key={section.id}
                  ref={el => { sectionRefs.current[section.id] = el; }}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  <Collapsible
                    open={openSections[section.id] !== false}
                    onOpenChange={() => toggleSection(section.id)}
                  >
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">
                          {section.title}
                        </span>
                      </div>
                      {openSections[section.id] === false ? (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3">
                        {section.content.map((para, i) => {
                          const isWarning = para.startsWith("DISCLAIMER") || para.startsWith("LIMITATION") || para.startsWith("INDEMNIFICATION");
                          return (
                            <p
                              key={i}
                              className={cn(
                                "text-sm leading-relaxed",
                                isWarning
                                  ? "text-destructive font-medium bg-destructive/5 p-3 rounded-lg border border-destructive/20"
                                  : "text-muted-foreground"
                              )}
                            >
                              {searchQuery && para.toLowerCase().includes(searchQuery.toLowerCase())
                                ? highlightText(para, searchQuery)
                                : para}
                            </p>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>

            {/* Scroll hint */}
            {!scrolledEnough && (
              <div className="flex items-center gap-2 p-3 mt-6 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Keep scrolling — you need to read at least 80% of the terms to continue.
                </p>
              </div>
            )}

            {scrolledEnough && (
              <div className="flex items-center gap-2 p-3 mt-6 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-green-500 text-sm">✓</span>
                <p className="text-xs text-green-600 dark:text-green-400">
                  You've read enough of the terms. You can now accept and continue.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom acceptance bar */}
      <div className="shrink-0 border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(!!v)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              I have read and agree to all <strong>Terms & Conditions</strong> (v{currentVersion})
            </span>
          </label>
          <Button
            onClick={handleContinue}
            disabled={!canContinue || saving}
            size="sm"
            className="w-full sm:w-auto"
          >
            {saving ? "Saving..." : "Accept & Continue"}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you agree to all YoCloud policies and Terms & Conditions (version {currentVersion})?
              This action will be recorded for your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept} disabled={saving}>
              {saving ? "Confirming..." : "Confirm ✅"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function highlightText(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
}
