import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageLayout } from "@/components/layout/AppLayout";
import { ExtractionForm } from "@/components/dashboard/ExtractionForm";
import { ExtractionsHistory } from "@/components/dashboard/ExtractionsHistory";
import { Loader2, LogOut, Download, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, error: authError, signOut } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const { data: extractions, error } = await supabase
        .from('extractions')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const statsData = {
        total: extractions?.length || 0,
        pending: extractions?.filter((e: any) => e.status === 'pending').length || 0,
        processing: extractions?.filter((e: any) => e.status === 'processing').length || 0,
        completed: extractions?.filter((e: any) => e.status === 'completed').length || 0,
        failed: extractions?.filter((e: any) => e.status === 'failed').length || 0
      };

      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Redirection si pas connecté
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  // Charger les stats quand l'utilisateur est connecté
  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  // Subscribe to realtime updates for extractions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('extractions-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'extractions',
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la déconnexion");
    }
  };

  // Gestion des erreurs d'auth
  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-sm text-red-500">Erreur de connexion: {authError}</p>
          <Button onClick={() => navigate("/auth")}>
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Download className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
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
                <p className="text-2xl font-bold">{stats.completed}</p>
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
