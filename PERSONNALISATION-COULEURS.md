# Système de Personnalisation des Couleurs par Utilisateur

## 🎨 Fonctionnement

Ce système permet à chaque utilisateur de personnaliser les couleurs de l'interface uniquement pour son compte, sans affecter les autres utilisateurs.

### 🎭 Thèmes Prédéfinis Disponibles

1. **Ash Scrap (Défaut)** - Jaune et bleu (#eab308, #2563eb)
2. **Océan** - Bleu profond et turquoise (#0891b2, #0f766e)
3. **Coucher de soleil** - Orange et rouge (#ea580c, #dc2626)
4. **Forêt** - Vert nature et émeraude (#16a34a, #059669)
5. **Violet Royal** - Violet et indigo (#9333ea, #4f46e5)
6. **Rose Gold** - Rose et or (#e11d48, #f59e0b)
7. **Monochrome** - Noir et gris (#374151, #6b7280)
8. **Néon** - Cyan et magenta (#06b6d4, #d946ef)
9. **Terre** - Marron et beige (#92400e, #a16207)
10. **Personnalisé** - Couleurs entièrement personnalisables

## 📋 Étapes d'installation

### 1. Créer la table en base de données
Exécuter le script SQL `user-branding-settings.sql` dans Supabase :

```sql
-- Voir le fichier user-branding-settings.sql pour le script complet
```

### 2. Fichiers modifiés
- `src/hooks/use-branding.ts` - Charge les paramètres par utilisateur
- `src/components/admin/BrandingSettings.tsx` - Interface de personnalisation
- `src/styles/custom-branding.css` - Classes CSS personnalisées
- `src/index.css` - Import des styles personnalisés

## 🚀 Utilisation

### Pour l'utilisateur :
1. Aller dans **Administration > Personnalisation**
2. **Choisir un thème prédéfini** parmi les 9 options disponibles
3. **OU** sélectionner "Personnalisé" pour créer ses propres couleurs
4. Cliquer sur **Enregistrer**
5. **L'effet est immédiat** - pas besoin de recharger la page

### Expérience utilisateur améliorée :
- **Sélection visuelle** avec aperçu des couleurs
- **Thèmes prêts à l'emploi** pour une personnalisation rapide
- **Mode avancé** pour les utilisateurs créatifs
- **Aperçu en temps réel** des couleurs personnalisées

### Pour le développeur :
Utiliser les couleurs personnalisées dans le code :

```tsx
// Via les variables CSS
<div style={{ color: 'var(--primary-color)' }}>Texte primaire</div>
<div style={{ color: 'var(--secondary-color)' }}>Texte secondaire</div>

// Via les classes CSS utilitaires
<div className="text-custom-primary">Texte primaire</div>
<div className="bg-custom-secondary">Fond secondaire</div>

// Via le store UI (comme dans le Sidebar)
const { brandingSettings } = useUIStore();
<span style={{ color: brandingSettings.primaryColor }}>Texte</span>
```

## 🔧 Classes CSS disponibles

### Couleurs de texte
- `.text-custom-primary` - Couleur primaire
- `.text-custom-secondary` - Couleur secondaire

### Couleurs de fond
- `.bg-custom-primary` - Fond primaire
- `.bg-custom-secondary` - Fond secondaire

### Bordures
- `.border-custom-primary` - Bordure primaire
- `.border-custom-secondary` - Bordure secondaire

### Boutons
- `.btn-custom-primary` - Bouton style primaire
- `.btn-custom-secondary` - Bouton style secondaire

### Gradient
- `.gradient-custom` - Gradient primaire vers secondaire

## 🔒 Sécurité

- **Row Level Security (RLS)** activé sur la table
- Chaque utilisateur ne peut voir/modifier que ses propres paramètres
- Paramètres par défaut si aucune personnalisation

## 📊 Base de données

### Table : `user_branding_settings`
- `user_id` - ID de l'utilisateur (FK vers auth.users)
- `company_name` - Nom personnalisé (défaut: "Ash Scrap")
- `theme_preset` - Thème sélectionné (défaut: "default")
- `primary_color` - Couleur primaire (défaut: "#eab308")
- `secondary_color` - Couleur secondaire (défaut: "#2563eb")
- `logo_url` - URL du logo personnalisé

## 🎯 Avantages

1. **Personnalisation individuelle** - Chaque utilisateur a ses propres couleurs
2. **Effet immédiat** - Pas besoin de recharger la page
3. **Sécurisé** - RLS empêche l'accès aux paramètres des autres
4. **Performant** - Chargement au démarrage + mise à jour en temps réel
5. **Flexible** - Variables CSS + classes utilitaires + store UI

## 🔄 Mise à jour en temps réel

Le système utilise :
- **Chargement initial** via `useBranding()` hook
- **Mise à jour immédiate** via CSS custom properties
- **Synchronisation** via Supabase realtime subscriptions
- **Store UI** pour la réactivité des composants React