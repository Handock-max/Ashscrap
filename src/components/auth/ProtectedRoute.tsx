import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTokenAuth } from '@/hooks/use-token-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, forceLogout } = useTokenAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      forceLogout("Vous avez été déconnecté");
      navigate('/auth', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, forceLogout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // La redirection se fait dans useEffect
  }

  return <>{children}</>;
};