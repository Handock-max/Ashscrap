import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Key, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type UserWithRole = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
};

export const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isAdding, setIsAdding] = useState(false);

  const loadUsers = async () => {
    try {
      console.log('Loading users...');
      setIsLoading(true);
      
      // Récupérer les profils d'abord
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles) {
        setUsers([]);
        return;
      }

      // Puis récupérer les rôles séparément pour éviter les problèmes de relation
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .single();

          return {
            ...profile,
            role: roleData?.role || "user",
          };
        })
      );

      setUsers(usersWithRoles);
      console.log(`Loaded ${usersWithRoles.length} users`);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error("Erreur lors du chargement des utilisateurs: " + error.message);
      setUsers([]); // Reset en cas d'erreur
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('UserManagement mounted, loading users...');
    loadUsers();

    // Écouter les changements en temps réel avec des canaux uniques
    const profilesChannel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          // Délai pour laisser le temps aux triggers de s'exécuter
          setTimeout(() => {
            loadUsers();
          }, 500);
        }
      )
      .subscribe();

    const rolesChannel = supabase
      .channel('admin-user-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
        },
        (payload) => {
          console.log('Role change detected:', payload);
          setTimeout(() => {
            loadUsers();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !newPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsAdding(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (error) throw error;

      if (data.user) {
        // Add role
        if (newRole === "admin") {
          await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: "admin" });
        }

        toast.success("Utilisateur créé avec succès");
        setNewEmail("");
        setNewPassword("");
        setNewRole("user");
        
        // Recharger immédiatement puis après un délai pour être sûr
        loadUsers();
        setTimeout(() => {
          loadUsers();
        }, 2000);
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Utiliser la fonction RPC admin pour supprimer l'utilisateur
      const { data, error } = await supabase.rpc('admin_delete_user', {
        _user_id: userId
      });

      if (error) throw error;

      toast.success("Utilisateur supprimé avec succès");
      
      // Recharger immédiatement
      loadUsers();
    } catch (error: any) {
      console.error("Erreur suppression:", error);
      toast.error("Erreur lors de la suppression: " + (error.message || "Erreur inconnue"));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-glow border-primary/10">
        <CardHeader>
          <CardTitle>Ajouter un utilisateur</CardTitle>
          <CardDescription>
            Créer un nouveau compte utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="utilisateur@exemple.fr"
                  disabled={isAdding}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isAdding}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={newRole} onValueChange={setNewRole} disabled={isAdding}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-white"
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Créer l'utilisateur
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-glow border-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Utilisateurs existants</CardTitle>
              <CardDescription>
                Liste de tous les utilisateurs de l'application ({users.length} utilisateurs)
              </CardDescription>
            </div>
            <Button
              onClick={loadUsers}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des utilisateurs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        <span>{user.role}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer {user.email} ?
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
