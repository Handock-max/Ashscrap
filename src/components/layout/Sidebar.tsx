import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
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

// Sidebar simple et performante
export const Sidebar: React.FC<SidebarProps> = ({ className, isAdmin = false }) => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, brandingSettings } = useUIStore();
  const isMobile = useIsMobile();

  const filteredItems = navigationItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <>
      {/* Overlay mobile */}
      {!sidebarCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-background border-r flex flex-col transition-all duration-300 ease-in-out",
          "md:relative md:z-auto",
          sidebarCollapsed ? "w-16" : "w-64",
          isMobile && sidebarCollapsed && "-translate-x-full",
          className
        )}
      >
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <img 
              src={LogoImage} 
              alt="WorkFlow Hub" 
              className="h-8 w-8 object-contain flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-semibold text-foreground truncate">
                  {brandingSettings?.companyName || 'WorkFlow Hub'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Extraction de données
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground font-medium",
                  sidebarCollapsed && "justify-center px-2"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer avec toggle */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full",
              sidebarCollapsed && "px-2"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Réduire
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bouton mobile */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 md:hidden h-10 w-10 p-0"
        >
          {sidebarCollapsed ? (
            <Menu className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
        </Button>
      )}
    </>
  );
};

// Wrapper simple sans dépendances complexes
interface SidebarWrapperProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export const SidebarWrapper: React.FC<SidebarWrapperProps> = ({ children, isAdmin = false }) => {
  const { sidebarCollapsed } = useUIStore();
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar isAdmin={isAdmin} />
      <main 
        className={cn(
          "flex-1 overflow-hidden transition-all duration-300",
          !isMobile && !sidebarCollapsed && "ml-64",
          !isMobile && sidebarCollapsed && "ml-16"
        )}
      >
        {children}
      </main>
    </div>
  );
};