-- =====================================================
-- MIGRATION SIMPLE - AJOUT EXPIRATION 7 JOURS
-- =====================================================
-- Cette migration ajoute SEULEMENT l'expiration automatique
-- AUCUN conflit possible avec l'existant

-- 1. AJOUTER SEULEMENT les colonnes nécessaires pour l'expiration

-- 2. AJOUTER SEULEMENT la colonne d'expiration (ultra-safe)
ALTER TABLE public.extractions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days');

-- 3. CRÉER UN INDEX pour la performance (ultra-safe)
CREATE INDEX IF NOT EXISTS idx_extractions_expires_at ON public.extractions(expires_at);

-- 4. FONCTION DE NETTOYAGE SIMPLE

-- Fonction simple de nettoyage (optionnelle)
CREATE OR REPLACE FUNCTION public.cleanup_expired_extractions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  -- Supprimer seulement les extractions expirées et terminées
  DELETE FROM public.extractions 
  WHERE expires_at < now() 
  AND status = 'completed';
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  
  RETURN _deleted_count;
END;
$$;

-- 5. PERMISSIONS (ultra-safe)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_extractions() TO authenticated;

-- 6. METTRE À JOUR les extractions existantes avec expires_at si NULL
UPDATE public.extractions 
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL;