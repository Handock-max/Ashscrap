import { useState, useEffect } from 'react';
import { TokenAuthService } from '@/services/tokenAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TokenAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  userData: {
    userId: string;
    username: string;
    isAdmin: boolean;
    fullName?: string;
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

  // Fonction pour enrichir les données utilisateur avec le profil Supabase
  const enrichUserData = async (tokenData: any) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', tokenData.userId)
        .single();
        
      return {
        userId: tokenData.userId,
        username: tokenData.username,
        isAdmin: tokenData.isAdmin,
        fullName: profile?.full_name || null
      };
    } catch (error) {
      console.warn('Erreur lors du chargement du profil:', error);
      return {
        userId: tokenData.userId,
        username: tokenData.username,
        isAdmin: tokenData.isAdmin,
        fullName: null
      };
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // Vérification instantanée au montage
      const tokenCheck = TokenAuthService.validateTokenLocal();
      
      if (tokenCheck.isValid && tokenCheck.userData) {
        const enrichedUserData = await enrichUserData(tokenCheck.userData);
        setState({
          isAuthenticated: true,
          isLoading: false,
          isAdmin: tokenCheck.userData.isAdmin,
          userData: enrichedUserData
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
    
    initAuth();
  }, []);

  const refreshAuth = async () => {
    const tokenCheck = TokenAuthService.validateTokenLocal();
    
    if (tokenCheck.isValid && tokenCheck.userData) {
      const enrichedUserData = await enrichUserData(tokenCheck.userData);
      setState({
        isAuthenticated: true,
        isLoading: false,
        isAdmin: tokenCheck.userData.isAdmin,
        userData: enrichedUserData
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
    // Mettre à jour l'état immédiatement pour une UX plus fluide
    setState({
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
      userData: null
    });

    try {
      // Déconnexion en arrière-plan
      await TokenAuthService.logout();
      toast.success("Vous avez été déconnecté");
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Ne pas afficher d'erreur car l'utilisateur est déjà déconnecté côté client
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