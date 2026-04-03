import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { WorkspaceProvider } from "@/hooks/useWorkspaces";
import { lazy, Suspense } from "react";
import { ProtectedRoute, AuthRoute, AdminRoute } from "@/components/RouteGuards";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
const SharedFile = lazy(() => import("./pages/SharedFile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const UpgradePage = lazy(() => import("./pages/UpgradePage"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const WorkspaceSettings = lazy(() => import("./pages/WorkspaceSettings"));
const JoinWorkspace = lazy(() => import("./pages/JoinWorkspace"));
const MarketplacePage = lazy(() => import("./pages/Marketplace"));
const MarketplaceDetail = lazy(() => import("./pages/MarketplaceDetail"));
const MarketplaceUserProfile = lazy(() => import("./pages/MarketplaceUserProfile"));
const MyMarketplaceListings = lazy(() => import("./pages/MyMarketplaceListings"));
const WorkspaceSearch = lazy(() => import("./pages/WorkspaceSearch"));
const MarketplaceChat = lazy(() => import("./pages/MarketplaceChat"));
const MarketplaceDashboard = lazy(() => import("./pages/MarketplaceDashboard"));
const DeveloperDashboard = lazy(() => import("./pages/DeveloperDashboard"));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage"));
const RequestInspectorPage = lazy(() => import("./pages/RequestInspectorPage"));
const NextjsGuidePage = lazy(() => import("./pages/docs/NextjsGuidePage"));
const ReactGuidePage = lazy(() => import("./pages/docs/ReactGuidePage"));
const VueGuidePage = lazy(() => import("./pages/docs/VueGuidePage"));
const FlutterGuidePage = lazy(() => import("./pages/docs/FlutterGuidePage"));
const PythonGuidePage = lazy(() => import("./pages/docs/PythonGuidePage"));
const GoGuidePage = lazy(() => import("./pages/docs/GoGuidePage"));
const TrashPage = lazy(() => import("./pages/TrashPage"));
const FeatureDocs = lazy(() => import("./pages/FeatureDocs"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));

const queryClient = new QueryClient();

function LazyFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
      <WorkspaceProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><Onboarding /></Suspense></ProtectedRoute>} />
            <Route path="/terms" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><TermsAndConditions /></Suspense></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><Dashboard /></Suspense></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><Suspense fallback={<LazyFallback />}><AdminDashboard /></Suspense></AdminRoute>} />
            <Route path="/trash" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><TrashPage /></Suspense></ProtectedRoute>} />
            <Route path="/docs/features" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><FeatureDocs /></Suspense></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><UpgradePage /></Suspense></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><NotificationsPage /></Suspense></ProtectedRoute>} />
            <Route path="/payment/success" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><PaymentResult /></Suspense></ProtectedRoute>} />
            <Route path="/payment/failed" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><PaymentResult /></Suspense></ProtectedRoute>} />
            <Route path="/share/:token" element={<Suspense fallback={<LazyFallback />}><SharedFile /></Suspense>} />
            <Route path="/code/:code" element={<Suspense fallback={<LazyFallback />}><SharedFile /></Suspense>} />
            <Route path="/menu" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MenuPage /></Suspense></ProtectedRoute>} />
            <Route path="/workspace" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><WorkspaceSettings /></Suspense></ProtectedRoute>} />
            <Route path="/workspace/search" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><WorkspaceSearch /></Suspense></ProtectedRoute>} />
            <Route path="/join/:token" element={<Suspense fallback={<LazyFallback />}><JoinWorkspace /></Suspense>} />
            <Route path="/marketplace" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MarketplacePage /></Suspense></ProtectedRoute>} />
            <Route path="/marketplace/my" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MyMarketplaceListings /></Suspense></ProtectedRoute>} />
            <Route path="/marketplace/dashboard" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MarketplaceDashboard /></Suspense></ProtectedRoute>} />
            <Route path="/marketplace/:id" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MarketplaceDetail /></Suspense></ProtectedRoute>} />
            <Route path="/marketplace/user/:userId" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MarketplaceUserProfile /></Suspense></ProtectedRoute>} />
            <Route path="/marketplace/chat" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MarketplaceChat /></Suspense></ProtectedRoute>} />
            <Route path="/marketplace/chat/:userId" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><MarketplaceChat /></Suspense></ProtectedRoute>} />
            <Route path="/developer" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><DeveloperDashboard /></Suspense></ProtectedRoute>} />
            <Route path="/developer/logs/:logId" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><RequestInspectorPage /></Suspense></ProtectedRoute>} />
            <Route path="/developer/docs" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><ApiDocsPage /></Suspense></ProtectedRoute>} />
            <Route path="/developer/docs/nextjs" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><NextjsGuidePage /></Suspense></ProtectedRoute>} />
            <Route path="/developer/docs/react" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><ReactGuidePage /></Suspense></ProtectedRoute>} />
            <Route path="/developer/docs/vue" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><VueGuidePage /></Suspense></ProtectedRoute>} />
            <Route path="/developer/docs/python" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><PythonGuidePage /></Suspense></ProtectedRoute>} />
            <Route path="/developer/docs/go" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><GoGuidePage /></Suspense></ProtectedRoute>} />
            <Route path="/developer/docs/flutter" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><FlutterGuidePage /></Suspense></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </WorkspaceProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
