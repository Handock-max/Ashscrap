# Guide de Déploiement

## GitHub Pages

### Configuration automatique via GitHub Actions

1. **Activer GitHub Pages** dans les paramètres du repository :
   - Aller dans Settings > Pages
   - Source : "GitHub Actions"

2. **Configurer les secrets** dans Settings > Secrets and variables > Actions :
   ```
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
   ```

3. **Déploiement automatique** :
   - Push sur la branche `main` déclenche automatiquement le déploiement
   - L'application sera disponible sur `https://username.github.io/workflow-hub/`

### Déploiement manuel

```bash
# Installer gh-pages si pas déjà fait
npm install -g gh-pages

# Déployer
npm run deploy:github
```

## Vercel

### Déploiement via interface web

1. **Connecter le repository** sur [vercel.com](https://vercel.com)
2. **Configurer les variables d'environnement** :
   ```
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
   ```
3. **Déployer** - Vercel détecte automatiquement la configuration

### Déploiement via CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Déploiement en production
vercel --prod
```

## Variables d'environnement requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |

## Configuration du routing

Les deux plateformes sont configurées pour gérer le routing côté client (SPA) :
- **GitHub Pages** : via le workflow qui copie `index.html` pour les routes 404
- **Vercel** : via `vercel.json` avec des rewrites

## Optimisations

- **Code splitting** : Chunks séparés pour vendor, router, UI, et Supabase
- **Cache** : Assets statiques mis en cache pour 1 an
- **Sourcemaps** : Activées pour le debugging en production