# Configuration Supabase - WorkFlow Hub (Plan Gratuit)

## 🚀 Configuration PRODUCTION - Plan Gratuit Uniquement

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet (plan gratuit)
3. Noter l'URL du projet et la clé anonyme

### 2. Variables d'environnement

Dans Vercel/GitHub, configurer :

```env
VITE_SUPABASE_URL=https://votre-projet-ref.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anonyme_ici
```

### 3. Appliquer la migration unique

Dans le dashboard Supabase :
1. Aller dans **SQL Editor**
2. Copier le contenu de `supabase/migrations/20251012000000_workflow_hub_complete.sql`
3. Exécuter le script
4. ✅ Votre backend est prêt !

## 📋 Fonctionnalités incluses (Plan Gratuit)

- ✅ **Authentification** : Inscription/connexion utilisateurs
- ✅ **Profils utilisateurs** : Gestion des profils
- ✅ **Rôles** : Admin/User avec permissions
- ✅ **Extractions** : CRUD complet des extractions
- ✅ **Paramètres app** : Branding personnalisable
- ✅ **Sécurité RLS** : Row Level Security
- ✅ **Performance** : Index optimisés

## 🚫 Fonctionnalités exclues (Nécessitent plan Pro)

- ❌ Edge Functions
- ❌ Notifications temps réel
- ❌ Audit logs avancés
- ❌ Rate limiting complexe
- ❌ Templates d'extraction

Cette configuration respecte strictement les limites du plan gratuit Supabase.

## 📊 Structure de la base de données

### Tables principales

#### `profiles`
- Profils utilisateurs avec informations personnelles
- Lié automatiquement à `auth.users`

#### `user_roles`
- Gestion des rôles (admin, user)
- Système de permissions granulaire

#### `extractions`
- Historique des extractions de données
- Statuts : pending, processing, completed, failed, cancelled

#### `extraction_templates`
- Templates réutilisables pour les extractions
- Partage public optionnel

#### `notifications`
- Système de notifications en temps réel
- Types : info, success, warning, error

#### `audit_logs`
- Traçabilité complète des actions
- IP, user-agent, anciennes/nouvelles valeurs

#### `app_settings`
- Configuration globale de l'application
- Branding personnalisable

### Vues

#### `extraction_stats`
- Statistiques agrégées par utilisateur
- Métriques de performance

## 🔐 Sécurité et permissions

### Row Level Security (RLS)

Toutes les tables ont RLS activé avec des politiques strictes :

- **Utilisateurs** : Accès uniquement à leurs propres données
- **Admins** : Accès complet avec traçabilité
- **Rate limiting** : Protection contre les abus
- **Validation** : Contrôle des paramètres d'entrée

### Fonctions de sécurité

- `has_role()` : Vérification des rôles
- `check_rate_limit()` : Limitation du taux de requêtes
- `validate_extraction_params()` : Validation des paramètres

## 🛠️ Fonctionnalités avancées

### Audit et traçabilité

```sql
-- Créer un log d'audit
SELECT public.create_audit_log(
  'UPDATE',
  'extractions',
  'uuid-here',
  '{"old": "values"}',
  '{"new": "values"}'
);
```

### Notifications temps réel

```typescript
// S'abonner aux notifications
NotificationsService.subscribeToNotifications(userId, (notification) => {
  console.log('Nouvelle notification:', notification)
})
```

### Export de données (GDPR)

```typescript
// Exporter toutes les données utilisateur
const userData = await AuthService.exportUserData()
```

### Nettoyage automatique

```sql
-- Nettoyer les logs anciens (admin uniquement)
SELECT public.cleanup_old_audit_logs(90); -- Garder 90 jours
```

## 📈 Monitoring et métriques

### Statistiques utilisateur

```typescript
// Résumé d'activité
const summary = await ExtractionsService.getUserActivitySummary(userId, 30)
```

### Statistiques globales (admin)

```typescript
// Stats pour tous les utilisateurs
const stats = await ExtractionsService.getExtractionStats()
```

## 🔧 Configuration avancée

### Hooks et triggers

- **Nouveau utilisateur** : Création automatique du profil et rôle
- **Changement de statut** : Notifications automatiques
- **Mise à jour** : Timestamps automatiques

### Edge Functions

- `send-extraction-notification` : Notifications par email
- Extensible pour d'autres intégrations

### Realtime

- Notifications en temps réel
- Mises à jour de statut d'extraction
- Synchronisation multi-onglets

## 🚨 Maintenance

### Tâches régulières

1. **Nettoyage des logs** : `cleanup_old_audit_logs()`
2. **Monitoring des performances** : Vérifier les index
3. **Sauvegarde** : Automatique via Supabase
4. **Mise à jour des types** : `supabase gen types typescript`

### Commandes utiles

```bash
# Générer les types TypeScript
supabase gen types typescript --local > src/integrations/supabase/types.ts

# Reset de la DB locale
supabase db reset

# Voir les logs
supabase functions logs send-extraction-notification

# Déployer une fonction
supabase functions deploy send-extraction-notification
```

## 🔗 Intégrations

### Email (à configurer)

- SendGrid, Resend, ou autre service SMTP
- Templates personnalisables
- Notifications transactionnelles

### Storage (optionnel)

- Stockage des fichiers d'extraction
- Génération d'URLs signées
- Nettoyage automatique

### Analytics (optionnel)

- Supabase Analytics
- Métriques personnalisées
- Tableaux de bord

## 🐛 Dépannage

### Erreurs communes

1. **RLS Policy** : Vérifier les permissions
2. **Rate Limit** : Attendre ou augmenter les limites
3. **Types** : Régénérer après changement de schéma
4. **Migration** : Vérifier l'ordre d'exécution

### Debug

```typescript
// Activer les logs Supabase
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session)
})
```