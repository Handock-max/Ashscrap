import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUIStore } from '@/stores/ui-store';

export const useBranding = () => {
  const { setBrandingSettings, brandingSettings } = useUIStore();

  useEffect(() => {
    const loadBrandingSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('*')
          .single();

        if (data) {
          const settings = {
            companyName: data.company_name || 'Ash Scrap',
            primaryColor: data.primary_color || '#eab308',
            secondaryColor: data.secondary_color || '#2563eb',
            logoUrl: data.logo_url || ''
          };

          setBrandingSettings(settings);

          // Apply CSS custom properties
          const root = document.documentElement;
          root.style.setProperty('--primary', settings.primaryColor);
          root.style.setProperty('--secondary', settings.secondaryColor);
        }
      } catch (error) {
        console.log('No branding settings found, using defaults');
      }
    };

    loadBrandingSettings();

    // Subscribe to changes in app_settings
    const channel = supabase
      .channel('branding-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        () => {
          loadBrandingSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setBrandingSettings]);

  return brandingSettings;
};