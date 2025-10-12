import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, Home } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Header = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();
        setIsAdmin(!!data);
      }
    };
    checkAdmin();
  }, []);

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

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            WorkFlow Hub
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
