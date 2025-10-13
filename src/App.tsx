import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useTokenAuth } from "@/hooks/use-token-auth";
import { useBranding } from "@/hooks/use-branding";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Extractions from "./pages/Extractions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, isLoading, isAdmin } = useTokenAuth();
  const location = useLocation();
  
  // Load branding settings
  useBranding();

  // Si l'utilisateur est connecté et sur /auth, rediriger vers le dashboard
  if (isAuthenticated && location.pathname === '/auth') {
    return <Navigate to="/" replace />;
  }

  return (
    <ProtectedRoute>
      <AppLayout isAdmin={isAdmin}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/extractions" element={<Extractions />} />
          <Route path="/profile" element={<Profile />} />
          <Route 
            path="/admin" 
            element={isAdmin ? <Admin /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
