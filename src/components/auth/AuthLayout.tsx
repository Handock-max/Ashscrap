import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle p-4">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
              WorkFlow Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              Automatisez vos extractions de données
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
