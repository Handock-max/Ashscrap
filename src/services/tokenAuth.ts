import { supabase } from '@/integrations/supabase/client';

interface TokenData {
  token: string;
  username: string;
  userId: string;
  expiresAt: number;
}

const TOKEN_KEY = 'workflow_hub_token';
const TOKEN_EXPIRY = 1 * 60 * 60 * 1000; // 1 heure

export class TokenAuthService {
  
  // Générer un token unique
  private static generateToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Créer et stocker un token après connexion
  static async createToken(email: string, userId: string): Promise<string> {
    const token = this.generateToken();
    const expiresAt = Date.now() + TOKEN_EXPIRY;
    
    const tokenData: TokenData = {
      token,
      username: email,
      userId,
      expiresAt
    };

    // Stocker dans sessionStorage
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
    
    // Stocker aussi dans Supabase pour validation côté serveur
    try {
      const { error } = await supabase
        .from('user_tokens')
        .upsert({
          user_id: userId,
          token,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Erreur lors de la sauvegarde du token:', error);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du token:', error);
    }

    return token;
  }

  // Vérifier si le token est valide
  static async validateToken(): Promise<{ isValid: boolean; userData?: TokenData }> {
    try {
      const tokenStr = sessionStorage.getItem(TOKEN_KEY);
      if (!tokenStr) {
        return { isValid: false };
      }

      const tokenData: TokenData = JSON.parse(tokenStr);
      
      // Vérifier l'expiration
      if (Date.now() > tokenData.expiresAt) {
        this.clearToken();
        return { isValid: false };
      }

      // Vérifier côté serveur
      const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', tokenData.userId)
        .eq('token', tokenData.token)
        .single();

      if (error || !data) {
        this.clearToken();
        return { isValid: false };
      }

      // Vérifier l'expiration côté serveur
      if (new Date(data.expires_at) < new Date()) {
        this.clearToken();
        await this.deleteServerToken(tokenData.userId, tokenData.token);
        return { isValid: false };
      }

      return { isValid: true, userData: tokenData };
    } catch (error) {
      console.error('Erreur lors de la validation du token:', error);
      this.clearToken();
      return { isValid: false };
    }
  }

  // Supprimer le token côté serveur
  private static async deleteServerToken(userId: string, token: string) {
    try {
      await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
    } catch (error) {
      console.error('Erreur lors de la suppression du token serveur:', error);
    }
  }

  // Nettoyer le token local
  static clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.clear();
  }

  // Déconnexion complète
  static async logout(): Promise<void> {
    const tokenStr = sessionStorage.getItem(TOKEN_KEY);
    
    if (tokenStr) {
      try {
        const tokenData: TokenData = JSON.parse(tokenStr);
        await this.deleteServerToken(tokenData.userId, tokenData.token);
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }

    // Nettoyer le stockage local
    this.clearToken();
    
    // Déconnexion Supabase
    await supabase.auth.signOut();
  }

  // Obtenir les données utilisateur du token
  static getUserData(): TokenData | null {
    try {
      const tokenStr = sessionStorage.getItem(TOKEN_KEY);
      if (!tokenStr) return null;
      
      const tokenData: TokenData = JSON.parse(tokenStr);
      
      // Vérifier l'expiration
      if (Date.now() > tokenData.expiresAt) {
        this.clearToken();
        return null;
      }
      
      return tokenData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
      this.clearToken();
      return null;
    }
  }
}