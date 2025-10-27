import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error";
import { useTokenAuth } from "@/hooks/use-token-auth";
import { useBranding } from "@/hooks/use-branding";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Extractions from "./pages/Extractions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthenticatedApp = ({ isAdmin }: { isAdmin: boolean }) => {
  // Load branding settings pour les utilisateurs authentifiés
  useBranding();
  
  return (
    <AppLayout isAdmin={isAdmin}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/extractions" element={<Extractions />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => {
  // Utiliser le hook pour une gestion réactive de l'état d'authentification
  const { isAuthenticated, isAdmin, isLoading } = useTokenAuth();

  // Afficher un loader pendant la vérification initiale
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route 
                path="/auth" 
                element={
                  isAuthenticated ? <Navigate to="/" replace /> : <Auth />
                } 
              />
              <Route 
                path="/*" 
                element={
                  isAuthenticated ? (
                    <AuthenticatedApp isAdmin={isAdmin} />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                } 
              />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
