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
  // État initial avec loading pour compatibilité
  const [state, setState] = useState<TokenAuthState>({
    isAuthenticated: false,
    isLoading: true,
    isAdmin: false,
    userData: null
  });

  useEffect(() => {
    // Vérification instantanée au montage
    const tokenCheck = TokenAuthService.validateTokenLocal();
    
    if (tokenCheck.isValid && tokenCheck.userData) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: tokenCheck.userData.isAdmin,
        userData: {
          userId: tokenCheck.userData.userId,
          username: tokenCheck.userData.username,
          isAdmin: tokenCheck.userData.isAdmin
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
  }, []);

  const refreshAuth = () => {
    const tokenCheck = TokenAuthService.validateTokenLocal();
    
    if (tokenCheck.isValid && tokenCheck.userData) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: tokenCheck.userData.isAdmin,
        userData: {
          userId: tokenCheck.userData.userId,
          username: tokenCheck.userData.username,
          isAdmin: tokenCheck.userData.isAdmin
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
    refreshAuth
  };
};