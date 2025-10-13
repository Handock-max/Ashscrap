-- =====================================================
-- ASH SCRAP - MIGRATION COMPLÈTE
-- =====================================================
-- Migration unique pour démarrer le projet à zéro
-- Inclut : Auth, Extractions, Admin, Expiration 7 jours
-- =====================================================

-- =====================================================
-- 1. ENUMS ET TYPES
-- =====================================================

-- Rôles utilisateur
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Statuts d'extraction
CREATE TYPE public.extraction_status AS ENUM (
  'pending',
  'processing', 
  'completed',
  'failed'
);

-- =====================================================
-- 2. TABLES PRINCIPALES
-- =====================================================

-- Table des profils utilisateur
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Table des rôles utilisateur
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Table des extractions (avec expiration 7 jours)
CREATE TABLE public.extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  country TEXT NOT NULL,
  company_type TEXT NOT NULL,
  company_age TEXT NOT NULL,
  file_format TEXT NOT NULL,
  status extraction_status NOT NULL DEFAULT 'pending',
  file_url TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Table des paramètres de l'application
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'Ash Scrap',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#eab308',
  secondary_color TEXT DEFAULT '#2563eb',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- 3. INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_extractions_user_id ON public.extractions(user_id);
CREATE INDEX idx_extractions_status ON public.extractions(status);
CREATE INDEX idx_extractions_created_at ON public.extractions(created_at DESC);
CREATE INDEX idx_extractions_expires_at ON public.extractions(expires_at);

-- =====================================================
-- 4. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fonction pour vérifier les rôles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction de nettoyage des extractions expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_extractions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _deleted_count INTEGER;
BEGIN
  DELETE FROM public.extractions 
  WHERE expires_at < now() 
  AND status = 'completed';
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  
  RETURN _deleted_count;
END;
$$;

-- Fonction pour supprimer un utilisateur (admin seulement)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_user_id UUID;
  _is_admin BOOLEAN;
BEGIN
  _current_user_id := auth.uid();
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _current_user_id 
    AND role = 'admin'
  ) INTO _is_admin;
  
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent supprimer des utilisateurs';
  END IF;

  IF _current_user_id = _user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre compte';
  END IF;

  DELETE FROM public.extractions WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END;
$$;

-- Fonction pour obtenir toutes les statistiques (admin seulement)
CREATE OR REPLACE FUNCTION public.admin_get_all_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_user_id UUID;
  _stats JSON;
BEGIN
  _current_user_id := auth.uid();
  
  IF NOT public.has_role(_current_user_id, 'admin') THEN
    RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent voir toutes les statistiques';
  END IF;

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
$$;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour la gestion des nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Politiques pour profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Politiques pour user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Politiques pour extractions
CREATE POLICY "Users can view their own extractions"
  ON public.extractions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own extractions"
  ON public.extractions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extractions"
  ON public.extractions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all extractions"
  ON public.extractions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all extractions"
  ON public.extractions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Politiques pour app_settings
CREATE POLICY "Everyone can view app settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 7. DONNÉES INITIALES
-- =====================================================

-- Insérer les paramètres par défaut de l'application
INSERT INTO public.app_settings (company_name, primary_color, secondary_color) 
VALUES ('Ash Scrap', '#eab308', '#2563eb');

-- =====================================================
-- 8. PERMISSIONS FINALES
-- =====================================================

-- Accorder les permissions nécessaires
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;