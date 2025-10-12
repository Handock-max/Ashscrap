import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Download, 
  Settings, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { 
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
// Logo depuis le dossier public pour un chargement optimisé
const LogoImage = '/images/Logo.png';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: Home,
    href: '/'
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Users,
    href: '/admin',
    adminOnly: true
  }
];

interface SidebarProps {
  className?: string;
  isAdmin?: boolean;
}

// Enhanced Sidebar component using the UI sidebar components
export const Sidebar: React.FC<SidebarProps> = ({ className, isAdmin = false }) => {
  const location = useLocation();
  const { brandingSettings } = useUIStore();
  const isMobile = useIsMobile();

  const filteredItems = navigationItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <UISidebar 
      collapsible="icon" 
      className={cn("border-r w-64 data-[state=collapsed]:w-16", className)}
    >
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <img 
            src={LogoImage} 
            alt="WorkFlow Hub" 
            className="h-8 w-8 object-contain flex-shrink-0"
          />
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-semibold text-foreground truncate">
              {brandingSettings?.companyName || 'WorkFlow Hub'}
            </span>
            <span className="text-xs text-muted-foreground">
              Extraction de données
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link to={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-center p-2">
          <SidebarTrigger />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </UISidebar>
  );
};

// Wrapper component to provide the sidebar context
interface SidebarWrapperProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export const SidebarWrapper: React.FC<SidebarWrapperProps> = ({ children, isAdmin = false }) => {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const isMobile = useIsMobile();

  // Auto-collapse on mobile and desktop by default for better UX
  useEffect(() => {
    // Toujours commencer avec la sidebar fermée pour une meilleure UX
    if (!sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, []);

  return (
    <SidebarProvider 
      open={!sidebarCollapsed} 
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      defaultOpen={false} // Commencer fermé par défaut
    >
      <div className="flex min-h-screen w-full">
        <Sidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};