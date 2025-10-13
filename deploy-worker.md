# Déploiement du Worker Cloudflare

## Configuration requise

### 1. Variables d'environnement
```bash
# Dans le dashboard Cloudflare Workers
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APOLLO_API_KEY=your-apollo-api-key
KASPR_API_KEY=your-kaspr-api-key
WORKER_URL=https://your-worker.your-subdomain.workers.dev
```

### 2. KV Namespace
```bash
# Créer le namespace KV pour stocker l'état des workflows
wrangler kv:namespace create "WORKFLOW_KV"
wrangler kv:namespace create "WORKFLOW_KV" --preview
```

### 3. Déploiement
```bash
# Installer Wrangler CLI
npm install -g wrangler

# Login Cloudflare
wrangler login

# Déployer
wrangler deploy
```

## Architecture du Workflow

### Étapes du processus :

1. **Collecting Places** (0-25%)
   - Collecte des enseignes via OpenStreetMap
   - Pagination : 500 résultats par batch, max 20 pages
   - Récupère : nom, adresse, site web, coordonnées

2. **Searching People** (25-50%)
   - Recherche des personnes clés via Apollo
   - Cibles : CEO, CTO, Founder, Manager, Director
   - 10 personnes max par entreprise

3. **Enriching Contacts** (50-70%)
   - Enrichissement Apollo avec emails/téléphones
   - Révélation des contacts personnels
   - Rate limiting : 100ms entre requêtes

4. **Enriching LinkedIn** (70-90%)
   - Enrichissement Kaspr pour contacts manquants
   - Backup si Apollo n'a pas trouvé
   - Rate limiting : 300ms entre requêtes

5. **Finalizing** (90-100%)
   - Fusion des données
   - Génération fichier CSV/Excel
   - Upload Supabase avec URL signée (7 jours)

### Gestion des timeouts :
- Chaque étape limitée à 25 secondes
- Sauvegarde automatique de l'état
- Reprise automatique via `/continue`
- Stockage temporaire dans KV (24h)

### Endpoints :

- `POST /extract` - Démarre l'extraction
- `GET /status?extraction_id=xxx` - Statut en temps réel
- `POST /continue` - Continue le workflow (interne)

### Format de réponse finale :
```csv
Prénom,Nom,Titre,Entreprise,Site Web,Email,Source Email,Téléphone,Source Téléphone,LinkedIn,Adresse Entreprise
```

### Expiration des fichiers :
- Lien de téléchargement valide 7 jours
- Nettoyage automatique des workflows terminés
- Stockage sécurisé dans Supabase Storage