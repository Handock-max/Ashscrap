-- =====================================================
-- MIGRATION OPTIONNELLE - SUPPRESSION D'UTILISATEURS
-- =====================================================
-- ⚠️  CETTE MIGRATION EST OPTIONNELLE
-- ⚠️  À APPLIQUER SEULEMENT QUAND TU VEUX ACTIVER LA SUPPRESSION D'UTILISATEURS
-- =====================================================

-- Fonction pour supprimer complètement un utilisateur (admin seulement)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  _current_user_id UUID;
BEGIN
  -- Vérifier que l'utilisateur actuel est admin
  _current_user_id := auth.uid();
  
  IF NOT public.has_role(_current_user_id, 'admin') THEN
    RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent supprimer des utilisateurs';
  END IF;

  -- Empêcher l'auto-suppression
  IF _current_user_id = _user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte';
  END IF;

  -- Supprimer les extractions de l'utilisateur (cascade vers extraction_places, extraction_people, extraction_logs)
  DELETE FROM public.extractions WHERE user_id = _user_id;
  
  -- Supprimer les rôles de l'utilisateur
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  
  -- Supprimer le profil (cela déclenchera la suppression en cascade dans auth.users si configuré)
  DELETE FROM public.profiles WHERE id = _user_id;
  
  -- Note: La suppression de auth.users nécessite des privilèges service_role
  -- Elle sera gérée côté application avec la clé service_role
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END;
$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- Log de la migration
INSERT INTO public.extraction_logs (extraction_id, step, level, message, details)
SELECT 
  gen_random_uuid(), 
  'migration', 
  'info', 
  'Migration admin_delete_user appliquée',
  json_build_object('timestamp', now(), 'version', '20251012000005')
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'extraction_logs');