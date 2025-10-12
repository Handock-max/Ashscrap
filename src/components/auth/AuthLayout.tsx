import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

// Logo depuis le dossier public pour un chargement optimisé
const LogoImage = '/images/Logo.png';

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12"
        style={{
          background: 'linear-gradient(135deg, hsl(221, 83%, 53%), hsl(262, 83%, 58%))'
        }}
      >
        <div className="text-center text-white" style={{ color: 'white' }}>
          <img 
            src={LogoImage} 
            alt="Ash Scrap" 
            className="h-24 w-auto mx-auto mb-8 drop-shadow-lg"
          />
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-yellow-400">Ash</span>{' '}
            <span className="text-blue-300">Scrap</span>
          </h1>
          <p className="text-xl opacity-90 mb-8">
            Automatisez vos extractions de données en toute simplicité
          </p>
          <div className="space-y-4 text-left max-w-md">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Extractions rapides et sécurisées</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Interface intuitive et moderne</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Gestion avancée des utilisateurs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img 
              src={LogoImage} 
              alt="WorkFlow Hub" 
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              WorkFlow Hub
            </h1>
            <p className="text-sm text-muted-foreground">
              Automatisez vos extractions de données
            </p>
          </div>
          
          <div className="bg-card rounded-xl shadow-lg border p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
