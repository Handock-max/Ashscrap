# Mapping des colonnes Apollo CSV

## Structure de ton CSV Apollo

### Colonnes principales utilisées :
- `First Name` → Prénom
- `Last Name` → Nom  
- `Title` → Titre (CEO, Deputy CEO, etc.)
- `Company Name` → Nom de l'entreprise
- `Website` → Site web de l'entreprise
- `Industry` → Secteur d'activité
- `# Employees` → Nombre d'employés
- `Annual Revenue` → Revenus annuels
- `City` → Ville
- `Country` → Pays

### Emails (3 niveaux) :
- `Email` → Email principal
- `Email Status` → Statut (Verified, etc.)
- `Secondary Email` → Email secondaire
- `Tertiary Email` → Email tertiaire

### Téléphones (multiple) :
- `Work Direct Phone` → Téléphone direct
- `Mobile Phone` → Mobile
- `Corporate Phone` → Téléphone corporate
- `Home Phone` → Téléphone domicile
- `Other Phone` → Autre téléphone

### LinkedIn :
- `Person Linkedin Url` → LinkedIn personnel
- `Company Linkedin Url` → LinkedIn entreprise

### Autres données utiles :
- `Seniority` → Niveau hiérarchique
- `Departments` → Départements
- `Keywords` → Mots-clés de l'entreprise
- `Technologies` → Technologies utilisées
- `Total Funding` → Financement total
- `Apollo Contact Id` → ID Apollo

## Filtres adaptés au format Apollo

```javascript
const filters = {
  industry: 'restaurants',           // Filtre sur Industry
  companySize: '51-200',            // Filtre sur # Employees
  revenue: '1M-10M',                // Filtre sur Annual Revenue
  city: 'paris',                    // Filtre sur City
  hasEmail: true,                   // Email, Secondary Email, Tertiary Email
  hasPhone: true,                   // Work Direct Phone, Mobile Phone, Corporate Phone
  ceoOnly: true,                    // Filtre sur Title (CEO, Chief Executive)
  verifiedEmailOnly: true           // Email Status = 'Verified'
};
```

## Exemple d'utilisation

```javascript
// Filtrer les CEO de restaurants parisiens avec email vérifié
const filteredCEOs = ceoService.filterCEOs(allCEOs, {
  industry: 'restaurants',
  city: 'paris',
  ceoOnly: true,
  verifiedEmailOnly: true,
  hasEmail: true
});
```