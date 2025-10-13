/**
 * Frontend CEO Extraction System
 * Architecture: Supabase Direct (pas de Cloudflare Workers)
 */

class CEOExtractionService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * 1. Récupérer les pays disponibles
   */
  async getAvailableCountries() {
    const { data, error } = await this.supabase
      .from('available_countries')
      .select('*')
      .eq('status', 'active')
      .order('country_name');

    if (error) throw error;
    return data;
  }

  /**
   * 2. Vérifier si un pays est disponible
   */
  async isCountryAvailable(countryName) {
    const { data, error } = await this.supabase
      .from('available_countries')
      .select('id, total_ceos, last_updated')
      .eq('country_name', countryName)
      .eq('status', 'active')
      .single();

    return { available: !error && data, data };
  }

  /**
   * 3. Télécharger et parser le CSV d'un pays
   */
  async downloadCountryCSV(countryName) {
    try {
      // Télécharger le fichier CSV depuis Supabase Storage
      const { data: csvBlob, error } = await this.supabase.storage
        .from('ceo-database')
        .download(`${countryName}.csv`);

      if (error) throw error;

      // Convertir en texte
      const csvText = await csvBlob.text();

      // Parser le CSV
      const ceos = this.parseCSV(csvText);

      console.log(`Loaded ${ceos.length} CEOs from ${countryName}`);
      return ceos;

    } catch (error) {
      console.error(`Error loading ${countryName} CEO database:`, error);
      throw new Error(`Ce pays n'a pas encore été ajouté à la liste`);
    }
  }

  /**
   * 4. Parser CSV en objets JavaScript
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const ceo = {};

      headers.forEach((header, index) => {
        ceo[header] = values[index] || '';
      });

      return ceo;
    });
  }

  /**
   * 5. Parser une ligne CSV (gère les guillemets)
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * 6. Filtrer les CEO selon les critères (adapté au format Apollo)
   */
  filterCEOs(ceos, filters) {
    return ceos.filter(ceo => {
      // Filtre par secteur d'activité (obligatoire)
      if (filters.industry) {
        if (!ceo.Industry?.toLowerCase().includes(filters.industry.toLowerCase())) {
          return false;
        }
      }

      // Filtre par taille d'entreprise (obligatoire)
      if (filters.companySize) {
        const employeeCount = parseInt(ceo['# Employees']) || 0;

        switch (filters.companySize) {
          case '1-10':
            if (employeeCount < 1 || employeeCount > 10) return false;
            break;
          case '11-50':
            if (employeeCount < 11 || employeeCount > 50) return false;
            break;
          case '51-200':
            if (employeeCount < 51 || employeeCount > 200) return false;
            break;
          case '200+':
            if (employeeCount < 200) return false;
            break;
        }
      }

      // Filtre par disponibilité email (toujours actif)
      if (filters.hasEmail) {
        if (!ceo.Email && !ceo['Secondary Email'] && !ceo['Tertiary Email']) {
          return false;
        }
      }

      // Filtre par statut email vérifié (optionnel mais recommandé)
      if (filters.verifiedEmailOnly) {
        if (ceo['Email Status'] !== 'Verified') {
          return false;
        }
      }

      // Filtre par poste spécifique (optionnel)
      if (filters.jobTitle) {
        const title = ceo.Title?.toLowerCase() || '';
        if (!title.includes(filters.jobTitle.toLowerCase())) {
          return false;
        }
      }

      // Filtre par mots-clés (optionnel)
      if (filters.keywords && filters.keywords.length > 0) {
        const searchText = [
          ceo.Keywords,
          ceo['Company Name'],
          ceo.Industry,
          ceo.Technologies
        ].join(' ').toLowerCase();

        const hasKeyword = filters.keywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );

        if (!hasKeyword) return false;
      }

      // Filtre par nombre de sites retail (optionnel)
      if (filters.retailLocations) {
        // Chercher dans les colonnes qui pourraient contenir cette info
        const locationInfo = [
          ceo['# Employees'], // Parfois corrélé avec le nombre de sites
          ceo.Keywords,
          ceo['Company Name']
        ].join(' ').toLowerCase();

        // Logique basique pour le nombre de sites
        // (à adapter selon la structure réelle des données Apollo)
        switch (filters.retailLocations) {
          case '1':
            // Au moins 1 site (pas de filtre spécifique)
            break;
          case '2-5':
            // Logique à implémenter selon les données disponibles
            break;
          case '6-10':
            // Logique à implémenter selon les données disponibles
            break;
          case '11-20':
            // Logique à implémenter selon les données disponibles
            break;
          case '21-50':
            // Logique à implémenter selon les données disponibles
            break;
          case '50+':
            // Logique à implémenter selon les données disponibles
            break;
        }
      }

      return true;
    });
  }

  /**
   * 7. Sauvegarder l'extraction filtrée dans Supabase Storage (7 jours)
   */
  async saveExtractionFile(ceos, extractionId, userId) {
    const csvContent = this.generateCSVContent(ceos);
    const filename = `${userId}/${extractionId}.csv`;

    // Upload vers user-extractions bucket (temporaire)
    const { data, error } = await this.supabase.storage
      .from('user-extractions')
      .upload(filename, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    if (error) throw error;

    // Générer URL signée (7 jours)
    const { data: signedUrl, error: urlError } = await this.supabase.storage
      .from('user-extractions')
      .createSignedUrl(filename, 604800); // 7 jours en secondes

    if (urlError) throw urlError;

    return signedUrl.signedUrl;
  }

  /**
   * 8. Générer le contenu CSV (sans télécharger)
   */
  generateCSVContent(ceos) {
    if (ceos.length === 0) {
      throw new Error('Aucun CEO trouvé avec ces critères');
    }

    // Headers du CSV (format Apollo)
    const headers = [
      'Prénom', 'Nom', 'Titre', 'Entreprise', 'Site Web', 'Secteur',
      'Employés', 'Revenus', 'Ville', 'Pays',
      'Email Principal', 'Statut Email', 'Email Secondaire', 'Email Tertiaire',
      'Téléphone Direct', 'Mobile', 'Téléphone Corporate',
      'LinkedIn Personnel', 'LinkedIn Entreprise'
    ];

    // Générer les lignes CSV
    const csvLines = [
      headers.join(','),
      ...ceos.map(ceo => [
        this.escapeCSV(ceo['First Name']),
        this.escapeCSV(ceo['Last Name']),
        this.escapeCSV(ceo.Title),
        this.escapeCSV(ceo['Company Name']),
        this.escapeCSV(ceo.Website),
        this.escapeCSV(ceo.Industry),
        ceo['# Employees'] || '',
        ceo['Annual Revenue'] || '',
        this.escapeCSV(ceo.City),
        this.escapeCSV(ceo.Country),
        this.escapeCSV(ceo.Email),
        this.escapeCSV(ceo['Email Status']),
        this.escapeCSV(ceo['Secondary Email']),
        this.escapeCSV(ceo['Tertiary Email']),
        this.escapeCSV(ceo['Work Direct Phone']),
        this.escapeCSV(ceo['Mobile Phone']),
        this.escapeCSV(ceo['Corporate Phone']),
        this.escapeCSV(ceo['Person Linkedin Url']),
        this.escapeCSV(ceo['Company Linkedin Url'])
      ].join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * 9. Télécharger le CSV côté client
   */
  downloadCSV(csvContent, filename = 'ceos_filtered.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  /**
   * 8. Échapper les valeurs CSV
   */
  escapeCSV(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * 10. Processus complet d'extraction avec sauvegarde
   */
  async performCompleteExtraction(country, filters) {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user.user) throw new Error('Utilisateur non connecté');

    // 1. Télécharger et filtrer les CEO
    const allCEOs = await this.downloadCountryCSV(country);
    const filteredCEOs = this.filterCEOs(allCEOs, filters);

    if (filteredCEOs.length === 0) {
      throw new Error('Aucun CEO trouvé avec ces critères');
    }

    // 2. Créer l'enregistrement d'extraction
    const { data: extraction, error } = await this.supabase
      .from('extractions')
      .insert({
        user_id: user.user.id,
        country: country,
        company_type: filters.industry || 'all',
        file_format: 'csv',
        status: 'completed',
        filters: filters,
        total_results: filteredCEOs.length,
        source_country: country,
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 jours
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Sauvegarder le fichier CSV (7 jours)
    const fileUrl = await this.saveExtractionFile(filteredCEOs, extraction.id, user.user.id);

    // 4. Mettre à jour l'extraction avec l'URL du fichier
    const { error: updateError } = await this.supabase
      .from('extractions')
      .update({ file_url: fileUrl })
      .eq('id', extraction.id);

    if (updateError) throw updateError;

    return {
      extraction: { ...extraction, file_url: fileUrl },
      totalResults: filteredCEOs.length,
      downloadUrl: fileUrl,
      csvContent: this.generateCSVContent(filteredCEOs) // Pour téléchargement immédiat si voulu
    };
  }

  /**
   * 11. Récupérer l'historique des extractions utilisateur
   */
  async getUserExtractions(limit = 10) {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user.user) throw new Error('Utilisateur non connecté');

    const { data, error } = await this.supabase
      .from('extractions')
      .select('*')
      .eq('user_id', user.user.id)
      .gte('expires_at', new Date().toISOString()) // Seulement les non-expirées
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * 12. Télécharger une extraction existante
   */
  async downloadExistingExtraction(extractionId) {
    const { data: extraction, error } = await this.supabase
      .from('extractions')
      .select('*')
      .eq('id', extractionId)
      .gte('expires_at', new Date().toISOString()) // Vérifier non-expirée
      .single();

    if (error || !extraction) {
      throw new Error('Extraction non trouvée ou expirée');
    }

    if (extraction.file_url) {
      // Ouvrir le lien de téléchargement
      window.open(extraction.file_url, '_blank');
      return extraction.file_url;
    } else {
      throw new Error('Fichier non disponible');
    }
  }

  /**
   * 13. Mettre à jour les statistiques
   */
  async updateStats(country, companyType) {
    const { error } = await this.supabase
      .from('extraction_stats')
      .upsert({
        country,
        company_type: companyType,
        total_extractions: 1,
        last_extraction: new Date().toISOString()
      }, {
        onConflict: 'country,company_type',
        ignoreDuplicates: false
      });

    if (error) console.warn('Stats update failed:', error);
  }
}

// Export pour utilisation
export default CEOExtractionService;