-- =====================================================
-- WORKFLOW HUB - MIGRATION PRODUCTION (PLAN GRATUIT)
-- =====================================================
-- Migration unique pour WorkFlow Hub - Plan gratuit Supabase uniquement
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

-- Table des extractions
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
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table des paramètres de l'application
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'WorkFlow Hub',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#64748b',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- 3. INDEX POUR PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_extractions_user_id ON public.extractions(user_id);
CREATE INDEX idx_extractions_status ON public.extractions(status);
CREATE INDEX idx_extractions_created_at ON public.extractions(created_at DESC);

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
VALUES ('WorkFlow Hub', '#3b82f6', '#64748b');

-- =====================================================
-- 8. PERMISSIONS FINALES
-- =====================================================

-- Accorder les permissions nécessaires
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- FIN DE LA MIGRATION - PLAN GRATUIT SUPABASE
-- =====================================================