import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const clearCacheAndRedirect = async () => {
    try {
      // Déconnexion de Supabase
      await supabase.auth.signOut();

      // Effacer le localStorage
      localStorage.clear();

      // Effacer le sessionStorage
      sessionStorage.clear();

      // Effacer les cookies (si possible)
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });

      // Effacer le cache du navigateur (si supporté)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      toast.success("Cache effacé avec succès");

      // Redirection vers la page de login après un court délai
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1000);

    } catch (error) {
      console.error("Erreur lors de l'effacement du cache:", error);
      toast.error("Erreur lors de l'effacement du cache");
      // Redirection quand même vers la page de login
      navigate("/auth");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Page introuvable</h2>
          <p className="text-muted-foreground">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-2" />
            Accueil
          </Button>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Problème persistant ? Essayez de vider le cache :
          </p>
          <Button
            onClick={clearCacheAndRedirect}
            variant="destructive"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Vider le cache et se reconnecter
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Route demandée: {location.pathname}
        </p>
      </div>
    </div>
  );
};

export default NotFound;
