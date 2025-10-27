import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Home } from "lucide-react";
import { useTokenAuth } from "@/hooks/use-token-auth";

export const Header = () => {
  const navigate = useNavigate();
  const { userData, logout, isAdmin } = useTokenAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // Utiliser window.location pour forcer la redirection
      window.location.href = "/auth";
    } catch (error: any) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">
            <span className="text-yellow-500">Ash</span>{' '}
            <span className="text-blue-600">Scrap</span>
          </h1>
        </div>

        <nav className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          {isAdmin && (
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <Settings className="h-4 w-4 mr-2" />
              Administration
            </Button>
          )}

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </nav>
      </div>
    </header>
  );
};
