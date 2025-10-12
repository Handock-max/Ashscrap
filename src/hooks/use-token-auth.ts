import { useState, useEffect } from 'react';
import { TokenAuthService } from '@/services/tokenAuth';
import { toast } from 'sonner';

interface TokenAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  userData: {
    userId: string;
    username: string;
    isAdmin: boolean;
  } | null;
}

export const useTokenAuth = () => {
  const [state, setState] = useState<TokenAuthState>({
    isAuthenticated: false,
    isLoading: true,
    isAdmin: false,
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
          isAdmin: userData.isAdmin,
          userData: {
            userId: userData.userId,
            username: userData.username,
            isAdmin: userData.isAdmin
          }
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          isAdmin: false,
          userData: null
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      setState({
        isAuthenticated: false,
        isLoading: false,
        isAdmin: false,
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
        isAdmin: false,
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
      isAdmin: false,
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