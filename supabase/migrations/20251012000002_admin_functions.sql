-- =====================================================
-- FONCTIONS ADMIN - SUPPRESSION UTILISATEURS
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

  -- Supprimer les extractions de l'utilisateur
  DELETE FROM public.extractions WHERE user_id = _user_id;
  
  -- Supprimer les rôles de l'utilisateur
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  
  -- Supprimer le profil (cela déclenchera la suppression en cascade dans auth.users)
  DELETE FROM public.profiles WHERE id = _user_id;
  
  -- Supprimer de auth.users (nécessite des privilèges élevés)
  DELETE FROM auth.users WHERE id = _user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END;
$;

-- Fonction pour obtenir toutes les statistiques (admin seulement)
CREATE OR REPLACE FUNCTION public.admin_get_all_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  _current_user_id UUID;
  _stats JSON;
BEGIN
  -- Vérifier que l'utilisateur actuel est admin
  _current_user_id := auth.uid();
  
  IF NOT public.has_role(_current_user_id, 'admin') THEN
    RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent voir toutes les statistiques';
  END IF;

  -- Construire les statistiques globales
  SELECT json_build_object(
    'total', (SELECT COUNT(*) FROM public.extractions),
    'pending', (SELECT COUNT(*) FROM public.extractions WHERE status = 'pending'),
    'processing', (SELECT COUNT(*) FROM public.extractions WHERE status = 'processing'),
    'completed', (SELECT COUNT(*) FROM public.extractions WHERE status = 'completed'),
    'failed', (SELECT COUNT(*) FROM public.extractions WHERE status = 'failed'),
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_admins', (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin')
  ) INTO _stats;
  
  RETURN _stats;
END;
$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_stats() TO authenticated;