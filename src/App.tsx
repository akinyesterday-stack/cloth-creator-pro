import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import FabricPrices from "./pages/FabricPrices";
import SavedCosts from "./pages/SavedCosts";
import Orders from "./pages/Orders";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import BuyerDashboard from "./pages/BuyerDashboard";
import BuyerNewOrder from "./pages/BuyerNewOrder";
import TedarikDashboard from "./pages/TedarikDashboard";
import TeamWorkspace from "./pages/TeamWorkspace";
import MudurDashboard from "./pages/MudurDashboard";
import SasDetail from "./pages/SasDetail";
import { Loader2 } from "lucide-react";
import { OrderNotificationListener } from "@/components/OrderNotificationListener";

const queryClient = new QueryClient();

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

  // Redirect team specialists to the shared team workspace
  if (
    ["planlama", "fabric", "kesim_takip", "fason"].includes(userType) &&
    window.location.pathname === "/"
  ) {
    return <Navigate to="/planlama" replace />;
  }

  // Redirect managers to their panel
  if (
    ["tedarik_muduru", "isletme_muduru"].includes(userType) &&
    window.location.pathname === "/"
  ) {
    return <Navigate to="/mudur" replace />;
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
      <Route
        path="/buyer/order/:orderId"
        element={
          <BuyerRoute>
            <BuyerNewOrder />
          </BuyerRoute>
        }
      />
      <Route
        path="/planlama"
        element={
          <ProtectedRoute>
            <TeamWorkspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mudur"
        element={
          <ProtectedRoute>
            <MudurDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sas/:workOrderId"
        element={
          <ProtectedRoute>
            <SasDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
