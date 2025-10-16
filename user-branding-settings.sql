-- Création de la table pour les paramètres de branding par utilisateur
CREATE TABLE IF NOT EXISTS user_branding_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT DEFAULT 'Ash Scrap',
    theme_preset TEXT DEFAULT 'default', -- Nouveau champ pour les thèmes prédéfinis
    primary_color TEXT DEFAULT '#eab308',
    secondary_color TEXT DEFAULT '#2563eb',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte pour s'assurer qu'un utilisateur n'a qu'un seul paramètre de branding
    UNIQUE(user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_branding_settings_user_id ON user_branding_settings(user_id);

-- Politique RLS (Row Level Security) pour que chaque utilisateur ne puisse voir que ses propres paramètres
ALTER TABLE user_branding_settings ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre à un utilisateur de voir ses propres paramètres
CREATE POLICY "Users can view their own branding settings" ON user_branding_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Politique pour permettre à un utilisateur de créer ses propres paramètres
CREATE POLICY "Users can create their own branding settings" ON user_branding_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique pour permettre à un utilisateur de modifier ses propres paramètres
CREATE POLICY "Users can update their own branding settings" ON user_branding_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Politique pour permettre à un utilisateur de supprimer ses propres paramètres
CREATE POLICY "Users can delete their own branding settings" ON user_branding_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_user_branding_settings_updated_at 
    BEFORE UPDATE ON user_branding_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour la documentation
COMMENT ON TABLE user_branding_settings IS 'Paramètres de personnalisation (branding) par utilisateur';
COMMENT ON COLUMN user_branding_settings.user_id IS 'ID de l''utilisateur propriétaire des paramètres';
COMMENT ON COLUMN user_branding_settings.company_name IS 'Nom de l''entreprise personnalisé';
COMMENT ON COLUMN user_branding_settings.primary_color IS 'Couleur primaire au format hexadécimal';
COMMENT ON COLUMN user_branding_settings.secondary_color IS 'Couleur secondaire au format hexadécimal';
COMMENT ON COLUMN user_branding_settings.logo_url IS 'URL du logo personnalisé';