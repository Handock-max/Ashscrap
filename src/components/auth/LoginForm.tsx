import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TokenAuthService } from "@/services/tokenAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast.success("Compte créé avec succès ! Vérifiez votre email.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Créer le token après connexion réussie
        if (data.user) {
          await TokenAuthService.createToken(email, data.user.id);
          toast.success("Connexion réussie !");
          // Forcer un refresh de la page pour que App.tsx réévalue l'auth
          window.location.href = "/";
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isSignUp ? "Créer un compte" : "Bon retour !"}
        </h2>
        <p className="text-muted-foreground">
          {isSignUp 
            ? "Rejoignez Ash Scrap pour commencer" 
            : "Connectez-vous à votre compte"
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Votre nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
              className="h-11"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Adresse email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-11"
            minLength={6}
          />
          {isSignUp && (
            <p className="text-xs text-muted-foreground">
              Minimum 6 caractères
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 font-medium bg-blue-600 hover:bg-blue-700 text-white border-0 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isSignUp ? "Création en cours..." : "Connexion..."}
            </>
          ) : (
            <>{isSignUp ? "Créer mon compte" : "Se connecter"}</>
          )}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setFullName("");
            setEmail("");
            setPassword("");
          }}
          className="text-sm text-primary hover:underline font-medium"
          disabled={isLoading}
        >
          {isSignUp
            ? "Déjà un compte ? Se connecter"
            : "Nouveau ? Créer un compte"}
        </button>
      </div>
    </div>
  );
};
