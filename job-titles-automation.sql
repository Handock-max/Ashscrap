-- =====================================================
-- SYSTÈME AUTOMATIQUE DE GESTION DES POSTES PAR PAYS
-- =====================================================

-- 1. Créer la table pour stocker les postes par pays
CREATE TABLE IF NOT EXISTS public.job_titles_by_country (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_code text NOT NULL, -- france, chine, usa, etc.
  country_name text NOT NULL, -- France, Chine, USA, etc.
  job_titles jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{"title": "CEO", "count": 150}, ...]
  total_profiles integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  file_size bigint DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'processing', 'error')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_titles_by_country_pkey PRIMARY KEY (id),
  CONSTRAINT job_titles_by_country_country_code_unique UNIQUE (country_code)
);

-- 2. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_job_titles_country_code ON public.job_titles_by_country(country_code);
CREATE INDEX IF NOT EXISTS idx_job_titles_status ON public.job_titles_by_country(status);

-- 3. Fonction pour parser un CSV et extraire les postes uniques
CREATE OR REPLACE FUNCTION extract_job_titles_from_csv(csv_content text)
RETURNS jsonb AS $$
DECLARE
  lines text[];
  headers text[];
  title_column_index integer := -1;
  line_data text[];
  job_title text;
  title_counts jsonb := '{}'::jsonb;
  result jsonb := '[]'::jsonb;
  current_count integer;
  title_key text;
BEGIN
  -- Diviser le CSV en lignes
  lines := string_to_array(csv_content, E'\n');
  
  IF array_length(lines, 1) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Parser les headers (première ligne)
  headers := string_to_array(replace(lines[1], '"', ''), ',');
  
  -- Trouver l'index de la colonne "Title"
  FOR i IN 1..array_length(headers, 1) LOOP
    IF trim(headers[i]) ILIKE '%title%' THEN
      title_column_index := i;
      EXIT;
    END IF;
  END LOOP;
  
  -- Si pas de colonne Title trouvée, retourner vide
  IF title_column_index = -1 THEN
    RETURN '[]'::jsonb;
  END IF;
  
  -- Parser chaque ligne de données (ignorer la première ligne des headers)
  FOR i IN 2..array_length(lines, 1) LOOP
    IF lines[i] IS NOT NULL AND trim(lines[i]) != '' THEN
      -- Parser la ligne CSV (gestion basique des guillemets)
      line_data := string_to_array(replace(lines[i], '"', ''), ',');
      
      -- Extraire le titre si la colonne existe
      IF array_length(line_data, 1) >= title_column_index THEN
        job_title := trim(line_data[title_column_index]);
        
        -- Ignorer les titres vides
        IF job_title IS NOT NULL AND job_title != '' THEN
          title_key := job_title;
          
          -- Compter les occurrences
          IF title_counts ? title_key THEN
            current_count := (title_counts->title_key)::integer;
            title_counts := jsonb_set(title_counts, ARRAY[title_key], to_jsonb(current_count + 1));
          ELSE
            title_counts := jsonb_set(title_counts, ARRAY[title_key], to_jsonb(1));
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Convertir en format array avec title et count
  SELECT jsonb_agg(
    jsonb_build_object(
      'title', key,
      'count', value::integer
    ) ORDER BY (value::integer) DESC
  ) INTO result
  FROM jsonb_each(title_counts);
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 4. Fonction pour traiter manuellement les données d'un pays
CREATE OR REPLACE FUNCTION process_country_job_titles(
  country_input text,
  job_titles_json jsonb,
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
  
  -- Insérer ou mettre à jour les données
  INSERT INTO public.job_titles_by_country (
    country_code, 
    country_name, 
    job_titles,
    total_profiles,
    status
  ) VALUES (
    v_country_code, 
    v_country_name, 
    job_titles_json,
    total_profiles_count,
    'active'
  )
  ON CONFLICT (country_code) 
  DO UPDATE SET 
    job_titles = EXCLUDED.job_titles,
    total_profiles = EXCLUDED.total_profiles,
    status = 'active',
    last_updated = now();
  
  RAISE NOTICE 'Updated job titles for %: % unique titles, % total profiles', 
    v_country_name, jsonb_array_length(job_titles_json), total_profiles_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Fonction pour supprimer les données d'un pays
CREATE OR REPLACE FUNCTION remove_country_data(file_path text)
RETURNS void AS $$
DECLARE
  v_country_code text;
BEGIN
  -- Extraire le nom du pays
  v_country_code := lower(regexp_replace(file_path, '\.csv$', '', 'i'));
  
  -- Supprimer l'entrée
  DELETE FROM public.job_titles_by_country 
  WHERE country_code = v_country_code;
  
  RAISE NOTICE 'Removed data for country: %', v_country_code;
END;
$$ LANGUAGE plpgsql;

-- 6. Fonction pour obtenir les postes d'un pays
CREATE OR REPLACE FUNCTION get_job_titles_for_country(country_input text)
RETURNS jsonb AS $$
DECLARE
  v_country_code text;
  result jsonb;
BEGIN
  v_country_code := lower(country_input);
  
  SELECT job_titles INTO result
  FROM public.job_titles_by_country
  WHERE country_code = v_country_code
    AND status = 'active';
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 7. Vue pour lister les pays disponibles
CREATE OR REPLACE VIEW available_countries_view AS
SELECT 
  country_code,
  country_name,
  total_profiles,
  jsonb_array_length(job_titles) as unique_job_titles,
  status,
  last_updated,
  file_size
FROM public.job_titles_by_country
WHERE status = 'active'
ORDER BY country_name;

-- 8. Fonction RPC pour l'API (accessible depuis le frontend)
CREATE OR REPLACE FUNCTION get_countries_with_job_titles()
RETURNS TABLE(
  country_code text,
  country_name text,
  total_profiles integer,
  unique_job_titles integer,
  last_updated timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jt.country_code,
    jt.country_name,
    jt.total_profiles,
    jsonb_array_length(jt.job_titles) as unique_job_titles,
    jt.last_updated
  FROM public.job_titles_by_country jt
  WHERE jt.status = 'active'
  ORDER BY jt.country_name;
END;
$$ LANGUAGE plpgsql;

-- 9. Permissions RLS (Row Level Security)
ALTER TABLE public.job_titles_by_country ENABLE ROW LEVEL SECURITY;

-- Politique pour lecture publique (tous les utilisateurs authentifiés)
CREATE POLICY "Allow read access to job titles" ON public.job_titles_by_country
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour écriture admin seulement
CREATE POLICY "Allow admin write access to job titles" ON public.job_titles_by_country
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 10. Exemple d'ajout manuel de données
-- SELECT process_country_job_titles(
--   'france',
--   '[
--     {"title": "CEO", "count": 1250},
--     {"title": "Chief Executive Officer", "count": 890},
--     {"title": "Directeur Général", "count": 650},
--     {"title": "President", "count": 420},
--     {"title": "Managing Director", "count": 380}
--   ]'::jsonb,
--   3590
-- );

-- =====================================================
-- INSTRUCTIONS D'UTILISATION (MODE MANUEL)
-- =====================================================

/*
1. POUR AJOUTER UN NOUVEAU PAYS :
   a) Uploadez le fichier CSV dans le bucket 'extractions' (ex: Chine.csv)
   b) Utilisez l'interface admin pour traiter le fichier
   c) Ou appelez manuellement : 
      SELECT process_country_job_titles('chine', '[{"title":"CEO","count":500}]'::jsonb, 1500);

2. POUR SUPPRIMER UN PAYS :
   - Appelez : SELECT remove_country_data('Chine.csv');

3. POUR OBTENIR LES POSTES D'UN PAYS (Frontend) :
   - SELECT get_job_titles_for_country('france');

4. POUR LISTER TOUS LES PAYS (Frontend) :
   - SELECT * FROM get_countries_with_job_titles();

WORKFLOW ADMIN :
1. Upload CSV dans bucket 'extractions'
2. Interface admin détecte le nouveau fichier
3. Admin clique "Traiter" pour extraire les postes
4. Système parse le CSV et sauvegarde dans job_titles_by_country
5. Pays devient disponible pour les utilisateurs
*/

-- Exemples d'utilisation depuis le frontend :
-- const { data } = await supabase.rpc('get_countries_with_job_titles');
-- const { data } = await supabase.rpc('get_job_titles_for_country', { country_input: 'france' });