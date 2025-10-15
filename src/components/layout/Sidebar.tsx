import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User,
  Settings,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTokenAuth } from '@/hooks/use-token-auth';

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
    id: 'extractions',
    label: 'Mes Extractions',
    icon: Download,
    href: '/extractions'
  },
  {
    id: 'profile',
    label: 'Mon profil',
    icon: User,
    href: '/profile'
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
  const { userData, isLoading } = useTokenAuth();

  // Fonction pour obtenir les initiales du nom
  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Fonction pour obtenir le nom d'affichage
  const getDisplayName = () => {
    if (userData?.username) {
      return userData.username;
    }
    return 'Utilisateur';
  };

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
              alt="Ash Scrap"
              className="h-8 w-8 object-contain flex-shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-semibold truncate">
                  <span style={{ color: brandingSettings.primaryColor }} className="font-bold">Ash</span>{' '}
                  <span style={{ color: brandingSettings.secondaryColor }} className="font-bold">Scrap</span>
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

        {/* Footer avec utilisateur et toggle */}
        <div className="border-t p-4 space-y-3">
          {/* Informations utilisateur */}
          {!isLoading && userData && (
            <div className={cn(
              "flex items-center gap-3 p-2 rounded-lg bg-muted/50",
              sidebarCollapsed && "justify-center"
            )}>
              {/* Avatar avec initiales */}
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white dark:bg-blue-600 dark:text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                {getInitials(userData.username, userData.username)}
              </div>

              {/* Nom et email (visible seulement quand étendu) */}
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {getDisplayName()}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {userData.username}
                  </span>
                  {isAdmin && (
                    <span className="text-xs text-primary font-medium">
                      Administrateur
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bouton toggle */}
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