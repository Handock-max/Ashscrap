import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/AppLayout";
import { ExtractionForm } from "@/components/dashboard/ExtractionForm";
import { ExtractionsHistory } from "@/components/dashboard/ExtractionsHistory";
import { Loader2, LogOut, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Déconnexion réussie");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la déconnexion");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const logoutButton = (
    <Button variant="outline" onClick={handleLogout} size="sm">
      <LogOut className="h-4 w-4 mr-2" />
      Déconnexion
    </Button>
  );

  return (
    <PageLayout 
      title="Tableau de bord" 
      description="Bienvenue dans votre espace de travail"
      actions={logoutButton}
      className="bg-gradient-to-br from-background to-muted/20"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Extractions totales</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Download className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="h-8 w-8 bg-orange-500/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-orange-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Terminées</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ExtractionForm />
          </div>
          <div>
            <ExtractionsHistory />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Index;
