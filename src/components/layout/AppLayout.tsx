import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarWrapper } from './Sidebar';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface AppLayoutProps {
  children?: React.ReactNode;
  showSidebar?: boolean;
  isAdmin?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showSidebar = true, 
  isAdmin = false 
}) => {
  if (!showSidebar) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <ErrorBoundary>
                {children || <Outlet />}
              </ErrorBoundary>
            </div>
          </main>
          <Toaster />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SidebarWrapper isAdmin={isAdmin}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <ErrorBoundary>
              {children || <Outlet />}
            </ErrorBoundary>
          </div>
        </div>
        <Toaster />
      </SidebarWrapper>
    </ErrorBoundary>
  );
};

interface PageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  description,
  children,
  actions,
  className
}) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Page Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Mobile sidebar trigger */}
            <SidebarTrigger className="md:hidden" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};