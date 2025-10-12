# Intégration Webhook N8N - WorkFlow Hub

## Vue d'ensemble

Le système de webhook de WorkFlow Hub sert de **point d'entrée principal** pour déclencher les workflows d'extraction de données via N8N. Chaque fois qu'un utilisateur lance une extraction depuis le formulaire, un webhook est automatiquement envoyé à votre instance N8N.

## Configuration

### 1. Variable d'environnement

Ajoutez la variable suivante dans votre configuration Vercel :

```env
VITE_WEBHOOK=https://votre-instance-n8n.com/webhook/extraction
```

### 2. Structure du payload webhook

Voici le JSON exact que N8N recevra :

```json
{
  "timestamp": "2025-01-12T14:30:00.000Z",
  "extraction_id": "550e8400-e29b-41d4-a716-446655440000",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "Jean Dupont"
  },
  "extraction_request": {
    "country": "France",
    "company_type": "Restauration",
    "company_age": "5-10",
    "file_format": "csv",
    "min_sites": "2-5",
    "keywords": ["pizza", "italien", "livraison"]
  }
}
```

### 3. Headers HTTP

Le webhook inclut les headers suivants :

```http
Content-Type: application/json
User-Agent: Ash Scrap/1.0
X-Webhook-Source: extraction-form
```

## Champs de données

### Informations système
- `timestamp` : Horodatage ISO 8601 de la requête
- `extraction_id` : UUID unique de l'extraction (clé primaire en base)

### Informations utilisateur
- `user.id` : UUID de l'utilisateur (référence Supabase)
- `user.email` : Email de l'utilisateur
- `user.full_name` : Nom complet (peut être null)

### Paramètres d'extraction
- `extraction_request.country` : Pays sélectionné
- `extraction_request.company_type` : Secteur d'activité
- `extraction_request.company_age` : Ancienneté ("0-2", "2-5", "5-10", "10+")
- `extraction_request.file_format` : Format de sortie ("csv" ou "excel")
- `extraction_request.min_sites` : Nombre de sites (optionnel, peut être null)
- `extraction_request.keywords` : Array de mots-clés (optionnel, peut être null)

## Configuration N8N

### 1. Webhook Trigger Node

Configurez un nœud "Webhook" avec :
- **HTTP Method** : POST
- **Path** : `/webhook/extraction`
- **Response Mode** : Respond Immediately
- **Response Code** : 200

### 2. Workflow suggéré

```
Webhook Trigger
    ↓
Switch Node (selon country/company_type)
    ↓
HTTP Request (API d'extraction de données)
    ↓
Data Processing (formatage des données)
    ↓
File Generation (CSV/Excel)
    ↓
Storage Upload (S3, Google Drive, etc.)
    ↓
Supabase Update (mise à jour du statut)
    ↓
Email Notification (optionnel)
```

### 3. Mise à jour du statut

Pour mettre à jour le statut de l'extraction dans Supabase :

```javascript
// Dans un nœud Code de N8N
const extractionId = $json.extraction_id;
const status = 'completed'; // ou 'failed'
const fileUrl = 'https://storage.example.com/file.csv';

// Appel API Supabase pour mise à jour
const updateData = {
  status: status,
  file_url: fileUrl,
  completed_at: new Date().toISOString(),
  duration: Math.floor((Date.now() - new Date($json.timestamp).getTime()) / 1000)
};
```

## Gestion des erreurs

### Côté WorkFlow Hub
- Si le webhook échoue, l'extraction continue normalement
- Les erreurs sont loggées mais n'interrompent pas le processus utilisateur
- Timeout configuré à 10 secondes

### Côté N8N
- Implémentez une gestion d'erreur pour mettre le statut à 'failed'
- Loggez les erreurs pour le debugging
- Envoyez une notification en cas d'échec

## Test et debugging

### 1. Test depuis l'interface admin

Accédez à l'onglet "Webhooks" dans l'interface d'administration pour :
- Vérifier la configuration de l'URL
- Tester la connectivité avec N8N
- Voir les logs des derniers tests

### 2. Payload de test

Le système envoie automatiquement ce payload de test :

```json
{
  "timestamp": "2025-01-12T14:30:00.000Z",
  "extraction_id": "test-1705069800000",
  "user": {
    "id": "test-user",
    "email": "test@example.com",
    "full_name": "Test User"
  },
  "extraction_request": {
    "country": "France",
    "company_type": "Test",
    "company_age": "5-10",
    "file_format": "csv",
    "min_sites": null,
    "keywords": null
  }
}
```

## Sécurité

### Recommandations
- Utilisez HTTPS pour l'URL du webhook
- Implémentez une authentification par token si nécessaire
- Validez les données reçues côté N8N
- Limitez les tentatives de retry en cas d'échec

### Validation des données
Le système valide automatiquement :
- Présence de l'extraction_id
- Présence des informations utilisateur
- Présence des paramètres d'extraction obligatoires

## Monitoring

### Logs disponibles
- Console du navigateur (erreurs webhook)
- Logs N8N (exécution des workflows)
- Logs Supabase (mises à jour de statut)

### Métriques suggérées
- Taux de succès des webhooks
- Temps de traitement moyen
- Nombre d'extractions par utilisateur
- Répartition par pays/secteur

## Support

En cas de problème :
1. Vérifiez la configuration de VITE_WEBHOOK
2. Testez la connectivité depuis l'interface admin
3. Consultez les logs N8N pour les erreurs de workflow
4. Vérifiez les mises à jour de statut dans Supabase