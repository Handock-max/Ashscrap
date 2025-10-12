import { useState, useEffect } from 'react';
import { TokenAuthService } from '@/services/tokenAuth';
import { toast } from 'sonner';

interface TokenAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userData: {
    userId: string;
    username: string;
  } | null;
}

export const useTokenAuth = () => {
  const [state, setState] = useState<TokenAuthState>({
    isAuthenticated: false,
    isLoading: true,
    userData: null
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { isValid, userData } = await TokenAuthService.validateToken();
      
      if (isValid && userData) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          userData: {
            userId: userData.userId,
            username: userData.username
          }
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          userData: null
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      setState({
        isAuthenticated: false,
        isLoading: false,
        userData: null
      });
    }
  };

  const logout = async () => {
    try {
      await TokenAuthService.logout();
      setState({
        isAuthenticated: false,
        isLoading: false,
        userData: null
      });
      toast.success("Vous avez été déconnecté");
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const forceLogout = (message: string = "Vous avez été déconnecté") => {
    TokenAuthService.clearToken();
    setState({
      isAuthenticated: false,
      isLoading: false,
      userData: null
    });
    toast.error(message);
  };

  return {
    ...state,
    logout,
    forceLogout,
    checkAuth
  };
};