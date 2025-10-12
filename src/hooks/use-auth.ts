import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: 'admin' | 'user';
  full_name?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isAdmin: false,
    isLoading: true,
    error: null
  });

  // Gestion de l'inactivité (15 minutes)
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes en millisecondes
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      // Récupérer le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Récupérer les rôles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return { ...profile, role: 'user' as const };
      }

      const isAdmin = roles?.some(r => r.role === 'admin') || false;

      return {
        ...profile,
        role: isAdmin ? 'admin' as const : 'user' as const
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    try {
      // Optimisation : ne pas montrer le loading si on a déjà un user
      if (!state.user) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          isAdmin: false,
          isLoading: false,
          error: error.message
        }));
        return;
      }

      if (user) {
        const profile = await fetchProfile(user.id);
        setState(prev => ({
          ...prev,
          user,
          profile,
          isAdmin: profile?.role === 'admin',
          isLoading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          isAdmin: false,
          isLoading: false,
          error: null
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  useEffect(() => {
    // Initial auth state check
    refreshUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState(prev => ({
            ...prev,
            user: session.user,
            profile,
            isAdmin: profile?.role === 'admin',
            isLoading: false,
            error: null
          }));
        } else if (event === 'SIGNED_OUT') {
          setState(prev => ({
            ...prev,
            user: null,
            profile: null,
            isAdmin: false,
            isLoading: false,
            error: null
          }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Nettoyer le timer d'inactivité
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        setState(prev => ({ ...prev, error: error.message }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error signing out'
      }));
    }
  };

  // Fonction pour réinitialiser le timer d'inactivité
  const resetInactivityTimer = useCallback(() => {
    setLastActivity(Date.now());

    // Nettoyer l'ancien timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Créer un nouveau timer seulement si l'utilisateur est connecté
    if (state.user) {
      // Timer d'avertissement (13 minutes)
      const warningTimer = setTimeout(() => {
        const remainingTime = Math.ceil((INACTIVITY_TIMEOUT - (Date.now() - lastActivity)) / 1000 / 60);
        if (remainingTime > 0) {
          console.log(`Déconnexion dans ${remainingTime} minutes pour inactivité`);
          // Ici vous pourriez ajouter une notification toast si vous voulez
        }
      }, INACTIVITY_TIMEOUT - 2 * 60 * 1000); // 2 minutes avant la déconnexion

      // Timer de déconnexion (15 minutes)
      const logoutTimer = setTimeout(() => {
        console.log('Déconnexion automatique pour inactivité');
        signOut();
      }, INACTIVITY_TIMEOUT);

      setInactivityTimer(logoutTimer);
    }
  }, [state.user, inactivityTimer, INACTIVITY_TIMEOUT, lastActivity]);

  // Détecter l'activité utilisateur
  useEffect(() => {
    if (!state.user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Ajouter les listeners d'activité
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialiser le timer
    resetInactivityTimer();

    return () => {
      // Nettoyer les listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });

      // Nettoyer le timer
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [state.user, resetInactivityTimer]);

  return {
    ...state,
    refreshUser,
    signOut
  };
};