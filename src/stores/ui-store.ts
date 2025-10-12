import { useState, useEffect, useCallback } from 'react';

interface BrandingSettings {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  brandingSettings: BrandingSettings;
}

// Simple state management without external dependencies
class UIStore {
  private state: UIState = {
    sidebarCollapsed: false,
    theme: 'system',
    brandingSettings: {
      companyName: 'WorkFlow Hub',
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b'
    }
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load from localStorage on initialization
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('ui-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load UI state from localStorage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('ui-store', JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save UI state to localStorage:', error);
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener());
    this.saveToStorage();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return this.state;
  }

  toggleSidebar() {
    this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
    this.notify();
  }

  setSidebarCollapsed(collapsed: boolean) {
    this.state.sidebarCollapsed = collapsed;
    this.notify();
  }

  setTheme(theme: 'light' | 'dark' | 'system') {
    this.state.theme = theme;
    this.notify();
  }

  setBrandingSettings(settings: BrandingSettings) {
    this.state.brandingSettings = settings;
    this.notify();
  }
}

const uiStore = new UIStore();

export const useUIStore = () => {
  const [state, setState] = useState(uiStore.getState());

  useEffect(() => {
    const unsubscribe = uiStore.subscribe(() => {
      setState(uiStore.getState());
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    toggleSidebar: useCallback(() => uiStore.toggleSidebar(), []),
    setSidebarCollapsed: useCallback((collapsed: boolean) => uiStore.setSidebarCollapsed(collapsed), []),
    setTheme: useCallback((theme: 'light' | 'dark' | 'system') => uiStore.setTheme(theme), []),
    setBrandingSettings: useCallback((settings: BrandingSettings) => uiStore.setBrandingSettings(settings), []),
  };
};