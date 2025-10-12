# Configuration Cloudflare Worker - Ash Scrap

## 🚀 Étapes de configuration

### 1. Installation Wrangler CLI

```bash
# Installer Wrangler globalement
npm install -g wrangler

# Se connecter à Cloudflare
wrangler login
```

### 2. Configuration des secrets

```bash
# Supabase
wrangler secret put SUPABASE_URL
# Entrer: https://ton-projet.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Entrer ta clé service_role depuis Supabase Dashboard > Settings > API

# Apollo API
wrangler secret put APOLLO_API_KEY
# Entrer ta clé API Apollo (inscription sur apollo.io)

# Kaspr API
wrangler secret put KASPR_API_KEY
# Entrer ta clé API Kaspr (inscription sur kaspr.io)
```

### 3. Créer le bucket Supabase Storage

Dans Supabase Dashboard > Storage :

1. Créer un nouveau bucket : `extractions`
2. Le rendre public
3. Configurer les policies :

```sql
-- Policy pour permettre l'upload via service_role
CREATE POLICY "Service role can upload extractions" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'extractions');

-- Policy pour permettre la lecture publique
CREATE POLICY "Public can read extractions" ON storage.objects
FOR SELECT USING (bucket_id = 'extractions');
```

### 4. Déploiement

```bash
# Déployer le worker
wrangler deploy

# Tester en local (optionnel)
wrangler dev
```

### 5. Configuration Frontend

Ajouter dans Vercel :

```env
VITE_EXTRACTION_WORKER_URL=https://ash-scrap-extraction.ton-subdomain.workers.dev
```

## 🔧 APIs requises

### Apollo.io
- **Plan minimum** : Starter ($49/mois)
- **Endpoint** : https://api.apollo.io/v1/people/search
- **Rate limit** : 10 req/sec

### Kaspr.io  
- **Plan minimum** : Professional ($65/mois)
- **Endpoint** : https://api.kaspr.io/api/v1/linkedin/profile
- **Rate limit** : 5 req/sec

### OpenStreetMap Nominatim
- **Gratuit** sans clé API
- **Rate limit** : 1 req/sec
- **Endpoint** : https://nominatim.openstreetmap.org/search

## 🧪 Test du Worker

### Test d'extraction

```bash
curl -X POST https://ton-worker.workers.dev/extract \
  -H "Content-Type: application/json" \
  -d '{
    "extraction_id": "test-123",
    "user_id": "user-456",
    "country": "France", 
    "company_type": "Restaurant",
    "file_format": "csv",
    "keywords": ["pizza", "italien"]
  }'
```

### Test de statut

```bash
curl "https://ton-worker.workers.dev/status?extraction_id=test-123"
```

## 📊 Workflow complet

1. **Frontend** → POST `/extract` → Worker
2. **Worker** → OpenStreetMap → Collecte des lieux
3. **Worker** → Apollo API → Recherche des dirigeants  
4. **Worker** → Kaspr API → Enrichissement contacts
5. **Worker** → Supabase Storage → Sauvegarde fichier CSV
6. **Worker** → Supabase DB → Mise à jour statut
7. **Frontend** → GET `/status` → Récupération du résultat

## ⚠️ Limites importantes

- **Timeout Worker** : 30 secondes max
- **Mémoire** : 128MB max
- **Concurrent** : 1000 requêtes simultanées
- **Apollo Rate Limit** : 10 req/sec
- **Kaspr Rate Limit** : 5 req/sec

Le worker traite automatiquement par batches pour respecter ces limites.

## 💰 Coûts estimés

### Cloudflare Workers
- **Gratuit** : 100,000 requêtes/jour
- **Payant** : $5/10M requêtes supplémentaires

### APIs (pour 1000 entreprises)
- **Apollo** : ~$2-5
- **Kaspr** : ~$3-7
- **OpenStreetMap** : Gratuit

## 🔍 Debugging

```bash
# Voir les logs en temps réel
wrangler tail

# Logs avec détails
wrangler tail --format=pretty
```

## ✅ Checklist finale

- [ ] Wrangler CLI installé et connecté
- [ ] 4 secrets configurés (Supabase + Apollo + Kaspr)
- [ ] Bucket `extractions` créé dans Supabase Storage
- [ ] Worker déployé avec succès
- [ ] Variable `VITE_EXTRACTION_WORKER_URL` ajoutée dans Vercel
- [ ] Test d'extraction fonctionnel