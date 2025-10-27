import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUIStore } from '@/stores/ui-store';
import { TokenAuthService } from '@/services/tokenAuth';
import { getThemeById } from '@/data/themes';

export const useBranding = () => {
  const { setBrandingSettings, brandingSettings } = useUIStore();

  useEffect(() => {
    const loadUserBrandingSettings = async () => {
      try {
        // Récupérer l'utilisateur connecté
        const userData = TokenAuthService.getUserData();
        if (!userData) {
          // Si pas d'utilisateur, utiliser les paramètres par défaut
          const defaultSettings = {
            companyName: 'Ash Scrap',
            primaryColor: '#eab308',
            secondaryColor: '#2563eb',
            logoUrl: ''
          };
          setBrandingSettings(defaultSettings);
          return;
        }

        // Charger les paramètres personnalisés de l'utilisateur
        const { data: userSettings, error } = await supabase
          .from('user_branding_settings')
          .select('*')
          .eq('user_id', userData.userId)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs si pas de résultat

        let settings;
        
        // Si erreur de requête (table n'existe pas, permissions, etc.), utiliser les valeurs par défaut
        if (error) {
          console.warn('Erreur lors du chargement des paramètres de branding:', error.message);
          settings = {
            companyName: 'Ash Scrap',
            primaryColor: '#eab308',
            secondaryColor: '#2563eb',
            logoUrl: ''
          };
        } else if (userSettings) {
          // Utiliser les paramètres personnalisés de l'utilisateur
          settings = {
            companyName: userSettings.company_name || 'Ash Scrap',
            primaryColor: userSettings.primary_color || '#eab308',
            secondaryColor: userSettings.secondary_color || '#2563eb',
            logoUrl: userSettings.logo_url || ''
          };
          
          console.log(`Thème "${userSettings.theme_preset || 'default'}" chargé pour l'utilisateur`);
        } else {
          // Utiliser les paramètres par défaut
          settings = {
            companyName: 'Ash Scrap',
            primaryColor: '#eab308',
            secondaryColor: '#2563eb',
            logoUrl: ''
          };
        }

        setBrandingSettings(settings);

        // Appliquer les couleurs immédiatement via CSS custom properties
        const root = document.documentElement;
        root.style.setProperty('--primary-color', settings.primaryColor);
        root.style.setProperty('--secondary-color', settings.secondaryColor);
        
        // Appliquer aussi aux variables Tailwind si elles existent
        root.style.setProperty('--color-primary', settings.primaryColor);
        root.style.setProperty('--color-secondary', settings.secondaryColor);

        console.log('Paramètres de branding chargés pour l\'utilisateur:', settings);
        
      } catch (error) {
        console.log('Aucun paramètre de branding personnalisé trouvé, utilisation des valeurs par défaut');
        
        // Paramètres par défaut
        const defaultSettings = {
          companyName: 'Ash Scrap',
          primaryColor: '#eab308',
          secondaryColor: '#2563eb',
          logoUrl: ''
        };
        
        setBrandingSettings(defaultSettings);
      }
    };

    loadUserBrandingSettings();

    // S'abonner aux changements des paramètres utilisateur
    const userData = TokenAuthService.getUserData();
    if (userData) {
      const channel = supabase
        .channel('user-branding-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_branding_settings',
            filter: `user_id=eq.${userData.userId}`
          },
          () => {
            loadUserBrandingSettings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [setBrandingSettings]);

  return brandingSettings;
};