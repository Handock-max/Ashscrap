# Ash Scrap - Extraction de données B2B

## 🚀 Démarrage rapide

### 1. Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter le script SQL complet :
   ```sql
   -- Copier-coller le contenu de :
   -- supabase/migrations/ash_scrap_complete.sql
   ```
3. Créer un bucket Storage nommé `extractions` (public)

### 2. Variables d'environnement

Créer `.env.local` :
```env
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta_cle_anon_supabase
VITE_EXTRACTION_WORKER_URL=https://ton-worker.workers.dev
```

### 3. Installation et démarrage

```bash
npm install
npm run dev
```

### 4. Cloudflare Worker (optionnel)

Pour les extractions automatisées via APIs :

1. Configurer le worker avec `worker.js` et `wrangler.toml`
2. Suivre le guide `CLOUDFLARE_WORKER_SETUP.md`

## 🎯 Fonctionnalités

- ✅ **Authentification** complète (inscription, connexion)
- ✅ **Gestion utilisateurs** (admin peut supprimer)
- ✅ **Extractions manuelles** avec formulaire
- ✅ **Extractions automatisées** via Cloudflare Worker
- ✅ **Expiration automatique** des fichiers (7 jours)
- ✅ **Interface admin** complète
- ✅ **Thèmes** clair/sombre
- ✅ **Branding** personnalisable

## 🔧 APIs supportées

- **OpenStreetMap Nominatim** (gratuit)
- **Apollo.io** (recherche dirigeants)
- **Kaspr.io** (enrichissement contacts)

## 📊 Architecture

```
Frontend (React + Supabase)
    ↓
Cloudflare Worker (optionnel)
    ↓
APIs externes (OpenStreetMap → Apollo → Kaspr)
    ↓
Supabase (Storage + Database)
```

## 🗄️ Base de données

- **profiles** - Profils utilisateurs
- **user_roles** - Rôles (admin/user)
- **extractions** - Historique des extractions
- **app_settings** - Configuration de l'app

## 🔒 Sécurité

- **RLS** activé sur toutes les tables
- **Authentification** Supabase
- **Permissions** par rôle
- **Validation** côté client et serveur

## 📝 Licence

MIT