# Configuration Cloudflare Worker - Ash Scrap

## 🚀 Déploiement du système d'extraction

### Étapes de configuration

1. **Installation Wrangler CLI**
```bash
npm install -g wrangler
wrangler login
```

2. **Configuration des secrets**
```bash
cd cloudflare-worker
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put APOLLO_API_KEY
wrangler secret put KASPR_API_KEY
```

3. **Déploiement**
```bash
wrangler deploy
```

### APIs requises

- **Apollo.io** : Recherche personnes + enrichissement
- **Kaspr.io** : Enrichissement LinkedIn  
- **OpenStreetMap** : Collecte des lieux (gratuit)

### Architecture

OpenStreetMap → Apollo → Kaspr → Supabase (7 jours) → Fichier final

### Variables Frontend

```env
VITE_EXTRACTION_WORKER_URL=https://extraction.ashscrap.com
```