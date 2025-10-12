# Migrations Ash Scrap - Guide Simple

## 🚀 ÉTAPE 1 : Expiration 7 jours (OBLIGATOIRE)

**Erreur SQL corrigée !** Exécuter dans Supabase SQL Editor :

```sql
-- Copier-coller le contenu de :
-- supabase/migrations/20251012000004_incremental_update.sql
```

**Ce que ça fait :**
- ✅ Ajoute la colonne `expires_at` 
- ✅ Configure l'expiration automatique à 7 jours
- ✅ Fonction de nettoyage simple
- ✅ **Syntaxe SQL corrigée** (problème `$` résolu)

## 🗑️ ÉTAPE 2 : Suppression utilisateurs (OPTIONNEL)

**Pour activer la suppression d'utilisateurs par les admins :**

```sql
-- Copier-coller le contenu de :
-- supabase/migrations/20251012000006_admin_delete_user_SIMPLE.sql
```

**Ce que ça fait :**
- ✅ Fonction `admin_delete_user()` 
- ✅ Vérification des droits admin
- ✅ Empêche l'auto-suppression
- ✅ Supprime extractions + rôles + profil

## 🧪 Test des fonctions

### Test nettoyage :
```sql
SELECT public.cleanup_expired_extractions();
```

### Test suppression (remplace USER_ID_HERE) :
```sql
SELECT public.admin_delete_user('USER_ID_HERE');
```

## ✅ Résultat

- **Expiration automatique** des fichiers après 7 jours
- **Suppression d'utilisateurs** par les admins
- **Code simple** et sans conflit