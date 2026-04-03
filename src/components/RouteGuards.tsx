import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useRoles";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTermsAcceptance } from "@/hooks/useTermsAcceptance";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { needsOnboarding, isLoading } = useOnboarding();
  const { needsTermsAcceptance, isLoading: termsLoading } = useTermsAcceptance();
  const location = useLocation();

  if (loading || isLoading || termsLoading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding && location.pathname !== "/onboarding" && location.pathname !== "/terms") {
    return <Navigate to="/onboarding" replace />;
  }
  if (needsTermsAcceptance && location.pathname !== "/terms" && location.pathname !== "/onboarding") {
    return <Navigate to="/terms" replace />;
  }
  return <>{children}</>;
}

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have permission to access this page. Contact your administrator for access.
        </p>
        <Button onClick={() => navigate("/")} variant="outline" className="w-full">
          Go back to Home
        </Button>
      </div>
    </div>
  );
}
