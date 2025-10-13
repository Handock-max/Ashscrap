# Intégration Production - Système CEO

## 1. Installation dans ton projet

```javascript
// Dans ton composant d'extraction
import CEOExtractionService from './services/frontend-ceo-extraction.js';

// Initialiser le service
const ceoService = new CEOExtractionService(supabase);
```

## 2. Bouton d'extraction principal

```javascript
const handleExtraction = async (filters) => {
  try {
    setLoading(true);
    setStatus('Extraction en cours...');

    // Vérifier pays disponible
    const { available } = await ceoService.isCountryAvailable(filters.country);
    if (!available) {
      throw new Error('Ce pays n\'a pas encore été ajouté à la liste');
    }

    // Extraction complète
    const result = await ceoService.performCompleteExtraction(filters.country, filters);
    
    // Téléchargement immédiat
    const filename = `ceos_${filters.country}_${Date.now()}.csv`;
    ceoService.downloadCSV(result.csvContent, filename);

    // Afficher succès avec bouton re-téléchargement
    setStatus(`✅ ${result.totalResults} CEOs extraits avec succès !`);
    setLastExtraction(result.extraction); // Pour bouton re-téléchargement

  } catch (error) {
    setStatus(`❌ Erreur: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
```

## 3. Historique des extractions avec boutons téléchargement

```javascript
const ExtractionHistory = () => {
  const [extractions, setExtractions] = useState([]);

  useEffect(() => {
    loadExtractions();
  }, []);

  const loadExtractions = async () => {
    try {
      const data = await ceoService.getUserExtractions(10);
      setExtractions(data);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const handleDownload = async (extractionId) => {
    try {
      await ceoService.downloadExistingExtraction(extractionId);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="extraction-history">
      <h3>Historique des extractions</h3>
      {extractions.map(extraction => (
        <div key={extraction.id} className="extraction-item">
          <div>
            <strong>{extraction.source_country}</strong> - {extraction.company_type}
            <br />
            <small>{extraction.total_results} résultats - {new Date(extraction.created_at).toLocaleDateString()}</small>
            <br />
            <small>Expire le: {new Date(extraction.expires_at).toLocaleDateString()}</small>
          </div>
          <button 
            onClick={() => handleDownload(extraction.id)}
            className="download-btn"
          >
            📥 Télécharger
          </button>
        </div>
      ))}
    </div>
  );
};
```

## 4. Interface complète

```javascript
const CEOExtractionPage = () => {
  const [countries, setCountries] = useState([]);
  const [filters, setFilters] = useState({
    country: '',
    industry: 'all',
    companySize: 'all',
    revenue: 'all',
    city: '',
    hasEmail: false,
    hasPhone: false
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [lastExtraction, setLastExtraction] = useState(null);

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      const data = await ceoService.getAvailableCountries();
      setCountries(data);
    } catch (error) {
      console.error('Erreur chargement pays:', error);
    }
  };

  return (
    <div className="ceo-extraction-page">
      {/* Formulaire de filtres */}
      <div className="filters-form">
        <select 
          value={filters.country} 
          onChange={(e) => setFilters({...filters, country: e.target.value})}
        >
          <option value="">Sélectionner un pays</option>
          {countries.map(country => (
            <option key={country.id} value={country.country_name}>
              {country.country_name} ({country.total_ceos} CEOs)
            </option>
          ))}
        </select>

        {/* Autres filtres... */}
        
        <button 
          onClick={() => handleExtraction(filters)}
          disabled={loading || !filters.country}
          className="extract-btn"
        >
          {loading ? 'Extraction...' : 'Extraire les CEO'}
        </button>
      </div>

      {/* Status */}
      {status && <div className="status">{status}</div>}

      {/* Bouton re-téléchargement si extraction récente */}
      {lastExtraction && (
        <button 
          onClick={() => ceoService.downloadExistingExtraction(lastExtraction.id)}
          className="redownload-btn"
        >
          📥 Re-télécharger la dernière extraction
        </button>
      )}

      {/* Historique */}
      <ExtractionHistory />
    </div>
  );
};
```

## 5. Fonctionnalités clés

✅ **Extraction instantanée** avec téléchargement immédiat  
✅ **Sauvegarde 7 jours** pour re-téléchargement  
✅ **Historique** des extractions avec boutons téléchargement  
✅ **Vérification expiration** automatique  
✅ **Gestion erreurs** (pays non disponible, etc.)  

## 6. Utilisation simple

```javascript
// Dans ton composant existant
const result = await ceoService.performCompleteExtraction('France', {
  industry: 'restaurant',
  companySize: '11-50',
  hasEmail: true
});

// Téléchargement immédiat
ceoService.downloadCSV(result.csvContent, 'mes_ceos.csv');
```