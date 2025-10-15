import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error";
import { TokenAuthService } from "@/services/tokenAuth";
import { useBranding } from "@/hooks/use-branding";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Extractions from "./pages/Extractions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Vérification instantanée du token (synchrone)
  const tokenCheck = TokenAuthService.validateTokenLocal();
  const isAuthenticated = tokenCheck.isValid;
  const isAdmin = tokenCheck.userData?.isAdmin || false;
  
  // Load branding settings
  useBranding();

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
                    <AppLayout isAdmin={isAdmin}>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/extractions" element={<Extractions />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
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
