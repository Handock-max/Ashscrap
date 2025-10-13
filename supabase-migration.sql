-- Migration pour la nouvelle architecture CEO Database
-- ATTENTION: Vérifier que ces colonnes n'existent pas déjà avant d'exécuter

-- 1. Ajouter colonnes pour le nouveau système (seulement si elles n'existent pas)
DO $$ 
BEGIN
    -- Ajouter filters si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'extractions' AND column_name = 'filters') THEN
        ALTER TABLE public.extractions ADD COLUMN filters jsonb;
    END IF;
    
    -- Ajouter total_results si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'extractions' AND column_name = 'total_results') THEN
        ALTER TABLE public.extractions ADD COLUMN total_results integer DEFAULT 0;
    END IF;
    
    -- Ajouter source_country si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'extractions' AND column_name = 'source_country') THEN
        ALTER TABLE public.extractions ADD COLUMN source_country text;
    END IF;
    
    -- Ajouter expires_at si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'extractions' AND column_name = 'expires_at') THEN
        ALTER TABLE public.extractions ADD COLUMN expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval);
    END IF;
END $$;

-- 2. Créer la table des pays disponibles
CREATE TABLE IF NOT EXISTS public.available_countries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_name text NOT NULL UNIQUE,
  country_code text NOT NULL, -- FR, PT, ES, etc.
  file_path text NOT NULL, -- chemin vers le CSV dans storage
  total_ceos integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'updating', 'inactive')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT available_countries_pkey PRIMARY KEY (id)
);

-- 3. Insérer les pays initiaux
INSERT INTO public.available_countries (country_name, country_code, file_path) VALUES
('France', 'FR', 'ceo-database/France.csv'),
('Portugal', 'PT', 'ceo-database/Portugal.csv'),
('Espagne', 'ES', 'ceo-database/Espagne.csv')
ON CONFLICT (country_name) DO NOTHING;

-- 4. Créer une table pour les statistiques d'extraction
CREATE TABLE IF NOT EXISTS public.extraction_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country text NOT NULL,
  company_type text,
  total_extractions integer DEFAULT 0,
  last_extraction timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT extraction_stats_pkey PRIMARY KEY (id)
);

-- 5. Mettre à jour l'enum extraction_status (simplifier)
-- ALTER TYPE extraction_status ADD VALUE IF NOT EXISTS 'instant_completed';

-- 6. Ajouter expiration aux extractions (7 jours)
ALTER TABLE public.extractions 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval);

-- 7. Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_extractions_user_country ON public.extractions(user_id, source_country);
CREATE INDEX IF NOT EXISTS idx_extractions_created_at ON public.extractions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extractions_expires_at ON public.extractions(expires_at);
CREATE INDEX IF NOT EXISTS idx_available_countries_status ON public.available_countries(status);

-- 8. Fonction pour nettoyer les extractions expirées
DROP FUNCTION IF EXISTS cleanup_expired_extractions();

CREATE FUNCTION cleanup_expired_extractions()
RETURNS void AS $$
BEGIN
  -- Supprimer les enregistrements expirés
  DELETE FROM public.extractions 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 9. Créer un trigger pour nettoyer automatiquement (optionnel)
-- Ou utiliser un cron job côté application