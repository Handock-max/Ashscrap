export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  preview: {
    gradient: string;
    textColor: string;
  };
}

export const themePresets: ThemePreset[] = [
  {
    id: 'default',
    name: 'Ash Scrap (Défaut)',
    description: 'Thème par défaut avec jaune et bleu',
    primaryColor: '#eab308',
    secondaryColor: '#2563eb',
    preview: {
      gradient: 'linear-gradient(135deg, #eab308, #2563eb)',
      textColor: '#1f2937'
    }
  },
  {
    id: 'ocean',
    name: 'Océan',
    description: 'Bleu profond et turquoise',
    primaryColor: '#0891b2',
    secondaryColor: '#0f766e',
    preview: {
      gradient: 'linear-gradient(135deg, #0891b2, #0f766e)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'sunset',
    name: 'Coucher de soleil',
    description: 'Orange et rouge chaleureux',
    primaryColor: '#ea580c',
    secondaryColor: '#dc2626',
    preview: {
      gradient: 'linear-gradient(135deg, #ea580c, #dc2626)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'forest',
    name: 'Forêt',
    description: 'Vert nature et émeraude',
    primaryColor: '#16a34a',
    secondaryColor: '#059669',
    preview: {
      gradient: 'linear-gradient(135deg, #16a34a, #059669)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'purple',
    name: 'Violet Royal',
    description: 'Violet et indigo élégant',
    primaryColor: '#9333ea',
    secondaryColor: '#4f46e5',
    preview: {
      gradient: 'linear-gradient(135deg, #9333ea, #4f46e5)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    description: 'Rose et or sophistiqué',
    primaryColor: '#e11d48',
    secondaryColor: '#f59e0b',
    preview: {
      gradient: 'linear-gradient(135deg, #e11d48, #f59e0b)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Noir et gris minimaliste',
    primaryColor: '#374151',
    secondaryColor: '#6b7280',
    preview: {
      gradient: 'linear-gradient(135deg, #374151, #6b7280)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'neon',
    name: 'Néon',
    description: 'Cyan et magenta vibrant',
    primaryColor: '#06b6d4',
    secondaryColor: '#d946ef',
    preview: {
      gradient: 'linear-gradient(135deg, #06b6d4, #d946ef)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'earth',
    name: 'Terre',
    description: 'Marron et beige naturel',
    primaryColor: '#92400e',
    secondaryColor: '#a16207',
    preview: {
      gradient: 'linear-gradient(135deg, #92400e, #a16207)',
      textColor: '#ffffff'
    }
  },
  {
    id: 'custom',
    name: 'Personnalisé',
    description: 'Créez votre propre combinaison',
    primaryColor: '#eab308',
    secondaryColor: '#2563eb',
    preview: {
      gradient: 'linear-gradient(135deg, #eab308, #2563eb)',
      textColor: '#1f2937'
    }
  }
];

export const getThemeById = (id: string): ThemePreset | undefined => {
  return themePresets.find(theme => theme.id === id);
};

export const getDefaultTheme = (): ThemePreset => {
  return themePresets[0]; // Thème par défaut
};