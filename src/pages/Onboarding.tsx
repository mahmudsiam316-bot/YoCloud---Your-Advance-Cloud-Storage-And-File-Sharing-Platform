import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useOnboarding, type UserPreferences } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Rocket, Sun, Moon, Monitor, GraduationCap, Code, Palette, Video, Briefcase, MoreHorizontal,
  HardDrive, Users, Cpu, Store, CloudUpload, ArrowLeft, ArrowRight, Check, Globe, Bell, Mail, Sparkles,
  ChevronDown, Search, User
} from "lucide-react";

const TOTAL_STEPS = 9;

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bangladesh","Belgium","Brazil","Canada",
  "Chile","China","Colombia","Czech Republic","Denmark","Egypt","Ethiopia","Finland","France","Germany",
  "Ghana","Greece","Hong Kong","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Japan","Jordan","Kenya","Kuwait","Malaysia","Mexico","Morocco","Nepal","Netherlands","New Zealand",
  "Nigeria","Norway","Pakistan","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia",
  "Saudi Arabia","Singapore","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland",
  "Taiwan","Tanzania","Thailand","Turkey","UAE","UK","Ukraine","USA","Vietnam"
];

const PROFESSIONS = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "developer", label: "Developer", icon: Code },
  { id: "designer", label: "Designer", icon: Palette },
  { id: "creator", label: "Content Creator", icon: Video },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

const USAGE_INTENTS = [
  { id: "storage", label: "File Storage", icon: HardDrive },
  { id: "collaboration", label: "Team Collaboration", icon: Users },
  { id: "api", label: "API Usage", icon: Cpu },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "backup", label: "Backup", icon: CloudUpload },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Beginner", desc: "I'm new to cloud storage" },
  { id: "intermediate", label: "Intermediate", desc: "I've used similar tools" },
  { id: "advanced", label: "Advanced", desc: "I'm a power user" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const { savePreferences } = useOnboarding();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedTheme, setSelectedTheme] = useState<string>("system");
  const [country, setCountry] = useState<string>("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [username, setUsername] = useState("");
  const [professions, setProfessions] = useState<string[]>([]);
  const [intents, setIntents] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [experienceLevel, setExperienceLevel] = useState("beginner");

  const progress = (step / TOTAL_STEPS) * 100;

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setDirection("forward");
      setStep(s => s + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection("backward");
      setStep(s => s - 1);
    }
  }, [step]);

  const toggleArrayItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const handleThemeSelect = (t: string) => {
    setSelectedTheme(t);
    setTheme(t as any);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Update profile display name
      if (displayName) {
        await supabase.from("profiles").update({ display_name: displayName }).eq("id", user!.id);
      }

      await savePreferences({
        theme: selectedTheme,
        country: country || null,
        profession: professions.length > 0 ? professions : ["general"],
        usage_intent: intents.length > 0 ? intents : ["storage"],
        notifications_enabled: notificationsEnabled,
        email_updates_enabled: emailUpdates,
        ai_enabled: aiEnabled,
        experience_level: experienceLevel,
        onboarding_completed: true,
      });

      toast.success("Setup complete! Now please review our Terms & Conditions.");
      navigate("/terms", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const animClass = direction === "forward"
    ? "animate-[slideInRight_0.35s_ease-out]"
    : "animate-[slideInLeft_0.35s_ease-out]";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Step indicator */}
      <div className="pt-6 px-4 text-center">
        <p className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className={cn("w-full max-w-md", animClass)} key={step}>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Welcome to YoCloud 🚀</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Let's personalize your experience in a few quick steps
                </p>
              </div>
              <Button onClick={goNext} size="lg" className="w-full max-w-xs mx-auto">
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Theme */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Choose your theme</h2>
                <p className="text-sm text-muted-foreground mt-1">Pick what feels right</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System", icon: Monitor },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeSelect(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      selectedTheme === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <t.icon className={cn("w-6 h-6", selectedTheme === t.id ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Country */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold text-foreground">Where are you from?</h2>
                <p className="text-sm text-muted-foreground mt-1">Helps us localize your experience</p>
              </div>
              <div className="relative">
                <div
                  onClick={() => setCountryOpen(!countryOpen)}
                  className="flex items-center justify-between w-full h-11 px-3 rounded-lg border border-input bg-background cursor-pointer"
                >
                  <span className={cn("text-sm", country ? "text-foreground" : "text-muted-foreground")}>
                    {country || "Select country"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
                {countryOpen && (
                  <div className="absolute top-12 left-0 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-hidden">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          className="h-8 pl-7 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-36">
                      {filteredCountries.map(c => (
                        <button
                          key={c}
                          onClick={() => { setCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                            country === c && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Profile */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <User className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold text-foreground">Set up your profile</h2>
                <p className="text-sm text-muted-foreground mt-1">Tell us a bit about yourself</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Full Name</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Username</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Profession */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">What do you do?</h2>
                <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PROFESSIONS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleArrayItem(professions, p.id, setProfessions)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left",
                      professions.includes(p.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p.icon className={cn("w-5 h-5 shrink-0", professions.includes(p.id) ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Usage Intent */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">What will you use YoCloud for?</h2>
                <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {USAGE_INTENTS.map(u => (
                  <button
                    key={u.id}
                    onClick={() => toggleArrayItem(intents, u.id, setIntents)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left",
                      intents.includes(u.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <u.icon className={cn("w-5 h-5 shrink-0", intents.includes(u.id) ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{u.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Smart Preferences */}
          {step === 7 && (
            <div className="space-y-6">
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="text-xl font-bold text-foreground">Smart Preferences</h2>
                <p className="text-sm text-muted-foreground mt-1">Customize your notifications & features</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Push Notifications", desc: "Get alerts for shares, comments & updates", icon: Bell, value: notificationsEnabled, setter: setNotificationsEnabled },
                  { label: "Email Updates", desc: "Receive product news & tips", icon: Mail, value: emailUpdates, setter: setEmailUpdates },
                  { label: "AI Features", desc: "Smart suggestions & file analysis", icon: Sparkles, value: aiEnabled, setter: setAiEnabled },
                ].map(pref => (
                  <div key={pref.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <pref.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{pref.label}</p>
                        <p className="text-xs text-muted-foreground">{pref.desc}</p>
                      </div>
                    </div>
                    <Switch checked={pref.value} onCheckedChange={pref.setter} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 8: Experience Level */}
          {step === 8 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Your experience level</h2>
                <p className="text-sm text-muted-foreground mt-1">We'll tailor the UI for you</p>
              </div>
              <div className="space-y-3">
                {EXPERIENCE_LEVELS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setExperienceLevel(l.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                      experienceLevel === l.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold">{l.label}</p>
                      <p className="text-xs text-muted-foreground">{l.desc}</p>
                    </div>
                    {experienceLevel === l.id && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
              {professions.includes("developer") && (
                <p className="text-xs text-center text-primary/80 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> We recommend dark mode for developers
                </p>
              )}
            </div>
          )}

          {/* Step 9: Summary */}
          {step === 9 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">You're all set!</h2>
                <p className="text-sm text-muted-foreground mt-1">Here's a summary of your setup</p>
              </div>
              <div className="space-y-3 text-sm">
                <SummaryRow label="Theme" value={selectedTheme} />
                <SummaryRow label="Country" value={country || "Not set"} />
                <SummaryRow label="Name" value={displayName || "Not set"} />
                <SummaryRow label="Profession" value={professions.length > 0 ? professions.map(p => PROFESSIONS.find(pr => pr.id === p)?.label).join(", ") : "General"} />
                <SummaryRow label="Usage" value={intents.length > 0 ? intents.map(i => USAGE_INTENTS.find(u => u.id === i)?.label).join(", ") : "File Storage"} />
                <SummaryRow label="Experience" value={EXPERIENCE_LEVELS.find(l => l.id === experienceLevel)?.label || "Beginner"} />
                <SummaryRow label="Notifications" value={notificationsEnabled ? "On" : "Off"} />
                <SummaryRow label="AI Features" value={aiEnabled ? "On" : "Off"} />
              </div>
              <Button onClick={handleFinish} size="lg" className="w-full" disabled={saving}>
                {saving ? "Setting up..." : "Finish Setup"} <Rocket className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      {step > 1 && (
        <div className="px-4 pb-6 flex items-center justify-between max-w-md mx-auto w-full">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < TOTAL_STEPS && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={goNext}>
                Skip
              </Button>
              <Button size="sm" onClick={goNext}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
