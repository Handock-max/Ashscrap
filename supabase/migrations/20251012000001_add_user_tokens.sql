-- Créer la table pour les tokens utilisateur
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);

-- RLS (Row Level Security)
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs ne puissent voir que leurs propres tokens
CREATE POLICY "Users can only see their own tokens" ON user_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Fonction pour nettoyer les tokens expirés (à exécuter périodiquement)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM user_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;