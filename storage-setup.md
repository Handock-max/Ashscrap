# Configuration Storage Supabase

## 1. Créer le bucket pour les CEO databases

```sql
-- Dans Supabase Dashboard > Storage
-- Créer un nouveau bucket : "ceo-database"
-- Public: false (accès contrôlé)
-- File size limit: 100MB
```

## 2. Structure des fichiers

```
ceo-database/          # Database permanente des CEO par pays
├── France.csv         # PERMANENT - Base CEO France
├── Portugal.csv       # PERMANENT - Base CEO Portugal  
├── Espagne.csv        # PERMANENT - Base CEO Espagne
└── ...

user-extractions/     # Extractions utilisateurs (7 jours)
├── user123_france_restaurants_20241013.csv  # TEMPORAIRE
├── user456_portugal_tech_20241013.csv       # TEMPORAIRE
└── ...
```

## 3. Format des fichiers CSV CEO

```csv
first_name,last_name,title,company_name,company_website,industry,employee_count,revenue,linkedin_url,email_apollo,phone_apollo,email_kaspr,phone_kaspr,city,country
Jean,Dupont,CEO,Restaurant Le Gourmet,legourmet.fr,Restaurant,45,850000,linkedin.com/in/jean-dupont,jean@legourmet.fr,+33123456789,jean.dupont@gmail.com,+33987654321,Paris,France
Marie,Martin,Chief Executive Officer,Pizzeria Milano,milano-pizza.fr,Restaurant,32,650000,linkedin.com/in/marie-martin,marie@milano-pizza.fr,+33234567890,,+33876543210,Lyon,France
```

## 4. Politique d'accès Storage

```sql
-- BUCKET 1: ceo-database (permanent)
-- Lecture pour utilisateurs authentifiés
CREATE POLICY "Allow authenticated users to read CEO databases" ON storage.objects
FOR SELECT USING (auth.role() = 'authenticated' AND bucket_id = 'ceo-database');

-- Upload pour admins seulement
CREATE POLICY "Allow admins to upload CEO databases" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'ceo-database'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- BUCKET 2: user-extractions (temporaire 7 jours)
-- Lecture pour le propriétaire seulement
CREATE POLICY "Allow users to read their own extractions" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' 
  AND bucket_id = 'user-extractions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Upload pour utilisateurs authentifiés
CREATE POLICY "Allow users to upload their extractions" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'user-extractions'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## 5. API Frontend simplifiée

```javascript
// Vérifier pays disponible
const { data: countries } = await supabase
  .from('available_countries')
  .select('*')
  .eq('status', 'active');

// Télécharger CSV du pays
const { data: csvBlob } = await supabase.storage
  .from('ceo-database')
  .download(`${country}.csv`);

// Parser et filtrer côté client
const csvText = await csvBlob.text();
const ceos = parseCSV(csvText);
const filtered = filterCEOs(ceos, userFilters);

// Générer nouveau CSV
downloadFilteredCSV(filtered);
```