import { useState, useEffect } from 'react';
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
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
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

  return {
    ...state,
    refreshUser,
    signOut
  };
};