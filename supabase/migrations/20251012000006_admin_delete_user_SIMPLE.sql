-- =====================================================
-- SUPPRESSION D'UTILISATEURS - VERSION SIMPLE
-- =====================================================
-- Fonction pour qu'un admin puisse supprimer un utilisateur

-- Fonction de suppression d'utilisateur (admin seulement)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_user_id UUID;
  _is_admin BOOLEAN;
BEGIN
  -- Récupérer l'utilisateur actuel
  _current_user_id := auth.uid();
  
  -- Vérifier si l'utilisateur actuel est admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _current_user_id 
    AND role = 'admin'
  ) INTO _is_admin;
  
  -- Vérifier les permissions
  IF NOT _is_admin THEN
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
  
  -- Supprimer le profil
  DELETE FROM public.profiles WHERE id = _user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;