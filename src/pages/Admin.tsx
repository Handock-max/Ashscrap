import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/AppLayout";
import { UserManagement } from "@/components/admin/UserManagement";
import { BrandingSettings } from "@/components/admin/BrandingSettings";
import { WebhookTest } from "@/components/admin/WebhookTest";
import { CountryManager } from "@/components/admin/CountryManager";
import { Loader2, LogOut, Users, Settings, Shield, Download, CheckCircle, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalExtractions: 0,
    systemStatus: 'OK'
  });

  const fetchAdminStats = async () => {
    try {
      // Get total users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total admins count
      const { count: adminsCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      // Get total extractions count
      const { count: extractionsCount } = await supabase
        .from('extractions')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersCount || 0,
        totalAdmins: adminsCount || 0,
        totalExtractions: extractionsCount || 0,
        systemStatus: 'OK'
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        // Vérification simple du rôle admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        if (!roles) {
          toast.error("Accès refusé : vous n'êtes pas administrateur");
          navigate("/");
          return;
        }

        setIsAdmin(true);
        await fetchAdminStats();
      } catch (error) {
        console.error('Erreur vérification admin:', error);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();

    // Subscribe to realtime updates for admin stats
    const usersChannel = supabase
      .channel('admin-stats-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAdminStats)
      .subscribe();

    const rolesChannel = supabase
      .channel('admin-stats-roles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, fetchAdminStats)
      .subscribe();

    const extractionsChannel = supabase
      .channel('admin-stats-extractions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extractions' }, fetchAdminStats)
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(extractionsChannel);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const logoutButton = (
    <Button variant="outline" onClick={handleLogout} size="sm">
      <LogOut className="h-4 w-4 mr-2" />
      Déconnexion
    </Button>
  );

  return (
    <PageLayout 
      title="Administration" 
      description="Panneau d'administration - Gérez votre plateforme"
      actions={logoutButton}
      className="bg-gradient-to-br from-background to-muted/20"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats admin */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.totalAdmins}</p>
              </div>
              <div className="h-8 w-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-purple-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Extractions</p>
                <p className="text-2xl font-bold">{stats.totalExtractions}</p>
              </div>
              <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                <Download className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Système</p>
                <p className="text-2xl font-bold text-green-600">{stats.systemStatus}</p>
              </div>
              <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <Tabs defaultValue="countries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="countries" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Pays
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Personnalisation
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="countries" className="space-y-4">
            <CountryManager />
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-4">
            <BrandingSettings />
          </TabsContent>
          
          <TabsContent value="webhooks" className="space-y-4">
            <WebhookTest />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Admin;
