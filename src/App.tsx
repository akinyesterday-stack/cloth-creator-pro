import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { OrderNotificationListener } from "@/components/OrderNotificationListener";
import { lazy, Suspense } from "react";

// Lazy load all pages for faster initial load
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const FabricPrices = lazy(() => import("./pages/FabricPrices"));
const SavedCosts = lazy(() => import("./pages/SavedCosts"));
const Orders = lazy(() => import("./pages/Orders"));
const Reports = lazy(() => import("./pages/Reports"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BuyerDashboard = lazy(() => import("./pages/BuyerDashboard"));
const BuyerNewOrder = lazy(() => import("./pages/BuyerNewOrder"));
const TedarikDashboard = lazy(() => import("./pages/TedarikDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min cache
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isApproved, isLoading, userType } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && !isApproved) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect buyer users to their dashboard
  if (userType === "buyer" && window.location.pathname === "/") {
    return <Navigate to="/buyer" replace />;
  }

  // Redirect tedarik_sorumlusu to their dashboard
  if (userType === "tedarik_sorumlusu" && window.location.pathname === "/") {
    return <Navigate to="/tedarik" replace />;
  }

  return <>{children}</>;
}

function BuyerRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isApproved, isLoading, userType } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile && !isApproved) {
    return <Navigate to="/auth" replace />;
  }

  // Only allow buyer users
  if (userType !== "buyer") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fabric-prices"
          element={
            <ProtectedRoute>
              <FabricPrices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved-costs"
          element={
            <ProtectedRoute>
              <SavedCosts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer"
          element={
            <BuyerRoute>
              <BuyerDashboard />
            </BuyerRoute>
          }
        />
        <Route
          path="/tedarik"
          element={
            <ProtectedRoute>
              <TedarikDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/new-order"
          element={
            <BuyerRoute>
              <BuyerNewOrder />
            </BuyerRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrderNotificationListener />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
