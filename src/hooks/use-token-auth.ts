import { useState } from 'react';
import { TokenAuthService } from '@/services/tokenAuth';
import { toast } from 'sonner';

interface TokenAuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userData: {
    userId: string;
    username: string;
    isAdmin: boolean;
  } | null;
}

// Hook simplifié pour les actions d'auth (login/logout)
export const useTokenAuth = () => {
  // État initial basé sur la vérification locale instantanée
  const getInitialState = (): TokenAuthState => {
    const tokenCheck = TokenAuthService.validateTokenLocal();
    
    if (tokenCheck.isValid && tokenCheck.userData) {
      return {
        isAuthenticated: true,
        isAdmin: tokenCheck.userData.isAdmin,
        userData: {
          userId: tokenCheck.userData.userId,
          username: tokenCheck.userData.username,
          isAdmin: tokenCheck.userData.isAdmin
        }
      };
    }
    
    return {
      isAuthenticated: false,
      isAdmin: false,
      userData: null
    };
  };

  const [state, setState] = useState<TokenAuthState>(getInitialState);

  const refreshAuth = () => {
    setState(getInitialState());
  };

  const logout = async () => {
    try {
      await TokenAuthService.logout();
      setState({
        isAuthenticated: false,
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