-- =====================================================
-- SYSTÈME AUTOMATIQUE DE GESTION DES INDUSTRIES PAR PAYS
-- =====================================================

-- 1. Créer la table pour stocker les industries par pays
CREATE TABLE IF NOT EXISTS public.industries_by_country (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_code text NOT NULL, -- france, chine, usa, etc.
  country_name text NOT NULL, -- France, Chine, USA, etc.
  industries jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{"industry": "Technology", "count": 250}, ...]
  total_profiles integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'processing', 'error')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT industries_by_country_pkey PRIMARY KEY (id),
  CONSTRAINT industries_by_country_country_code_unique UNIQUE (country_code)
);

-- 2. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_industries_country_code ON public.industries_by_country(country_code);
CREATE INDEX IF NOT EXISTS idx_industries_status ON public.industries_by_country(status);

-- 3. Fonction pour traiter manuellement les industries d'un pays
CREATE OR REPLACE FUNCTION process_country_industries(
  country_input text,
  industries_json jsonb,
  total_profiles_count integer DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_country_code text;
  v_country_name text;
BEGIN
  -- Normaliser les noms
  v_country_name := initcap(country_input);
  v_country_code := lower(country_input);
  
  -- Insérer ou mettre à jour les industries
  INSERT INTO public.industries_by_country (
    country_code, 
    country_name, 
    industries,
    total_profiles,
    status
  ) VALUES (
    v_country_code, 
    v_country_name, 
    industries_json,
    total_profiles_count,
    'active'
  )
  ON CONFLICT (country_code) 
  DO UPDATE SET 
    industries = EXCLUDED.industries,
    total_profiles = EXCLUDED.total_profiles,
    status = 'active',
    last_updated = now();
  
  RAISE NOTICE 'Updated industries for %: % unique industries, % total profiles', 
    v_country_name, jsonb_array_length(industries_json), total_profiles_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Fonction pour obtenir les industries d'un pays
CREATE OR REPLACE FUNCTION get_industries_for_country(country_input text)
RETURNS jsonb AS $$
DECLARE
  v_country_code text;
  result jsonb;
BEGIN
  v_country_code := lower(country_input);
  
  SELECT industries INTO result
  FROM public.industries_by_country
  WHERE country_code = v_country_code
    AND status = 'active';
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 5. Fonction pour supprimer les industries d'un pays
CREATE OR REPLACE FUNCTION remove_country_industries(file_path text)
RETURNS void AS $$
DECLARE
  v_country_code text;
BEGIN
  -- Extraire le nom du pays
  v_country_code := lower(regexp_replace(file_path, '\.csv$', '', 'i'));
  
  -- Supprimer l'entrée
  DELETE FROM public.industries_by_country 
  WHERE country_code = v_country_code;
  
  RAISE NOTICE 'Removed industries for country: %', v_country_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Vue pour lister les pays avec industries disponibles
CREATE OR REPLACE VIEW available_countries_industries_view AS
SELECT 
  country_code,
  country_name,
  total_profiles,
  jsonb_array_length(industries) as unique_industries,
  status,
  last_updated
FROM public.industries_by_country
WHERE status = 'active'
ORDER BY country_name;

-- 7. Fonction RPC pour l'API (accessible depuis le frontend)
CREATE OR REPLACE FUNCTION get_countries_with_industries()
RETURNS TABLE(
  country_code text,
  country_name text,
  total_profiles integer,
  unique_industries integer,
  last_updated timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ind.country_code,
    ind.country_name,
    ind.total_profiles,
    jsonb_array_length(ind.industries) as unique_industries,
    ind.last_updated
  FROM public.industries_by_country ind
  WHERE ind.status = 'active'
  ORDER BY ind.country_name;
END;
$$ LANGUAGE plpgsql;

-- 8. Permissions RLS (Row Level Security)
ALTER TABLE public.industries_by_country ENABLE ROW LEVEL SECURITY;

-- Politique pour lecture publique (tous les utilisateurs authentifiés)
CREATE POLICY "Allow read access to industries" ON public.industries_by_country
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour écriture admin seulement
CREATE POLICY "Allow admin write access to industries" ON public.industries_by_country
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =====================================================
-- INSTRUCTIONS D'UTILISATION
-- =====================================================

/*
1. POUR AJOUTER LES INDUSTRIES D'UN NOUVEAU PAYS :
   - Appelez : SELECT process_country_industries('france', '[{"industry":"Technology","count":500}]'::jsonb, 1500);

2. POUR SUPPRIMER LES INDUSTRIES D'UN PAYS :
   - Appelez : SELECT remove_country_industries('France.csv');

3. POUR OBTENIR LES INDUSTRIES D'UN PAYS (Frontend) :
   - SELECT get_industries_for_country('france');

4. POUR LISTER TOUS LES PAYS AVEC INDUSTRIES (Frontend) :
   - SELECT * FROM get_countries_with_industries();

WORKFLOW ADMIN :
1. Upload CSV dans bucket 'extractions'
2. Interface admin traite le fichier
3. Système parse le CSV et extrait les industries uniques de la colonne "Industry"
4. Sauvegarde dans industries_by_country
5. Industries deviennent disponibles pour les utilisateurs
*/

-- Exemples d'utilisation depuis le frontend :
-- const { data } = await supabase.rpc('get_countries_with_industries');
-- const { data } = await supabase.rpc('get_industries_for_country', { country_input: 'france' });