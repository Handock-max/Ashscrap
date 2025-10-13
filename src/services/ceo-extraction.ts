import { supabase } from "@/integrations/supabase/client";

export interface JobTitle {
  title: string;
  count: number;
}

export interface ExtractionFilters {
  industries: string[];
  companySize: string;
  hasEmail?: boolean;
  verifiedEmailOnly?: boolean;
  keywords?: string[];
  retailLocations?: string;
  jobTitle?: string;
}

export interface CEO {
  'First Name': string;
  'Last Name': string;
  'Title': string;
  'Company Name': string;
  'Website': string;
  'Industry': string;
  '# Employees': string;
  'Annual Revenue': string;
  'City': string;
  'Country': string;
  'Email': string;
  'Email Status': string;
  'Secondary Email': string;
  'Tertiary Email': string;
  'Work Direct Phone': string;
  'Mobile Phone': string;
  'Corporate Phone': string;
  'Person Linkedin Url': string;
  'Company Linkedin Url': string;
  'Keywords': string;
  'Technologies': string;
  [key: string]: string;
}

export class CEOExtractionService {
  constructor(private supabaseClient: typeof supabase) {}

  /**
   * Télécharger et parser le CSV d'un pays
   */
  async downloadCountryCSV(countryName: string): Promise<CEO[]> {
    try {
      // Télécharger le fichier CSV depuis Supabase Storage
      const { data: csvBlob, error } = await this.supabaseClient.storage
        .from('extractions')
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
   * Parser CSV en objets JavaScript
   */
  private parseCSV(csvText: string): CEO[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const ceo: any = {};

      headers.forEach((header, index) => {
        ceo[header] = values[index] || '';
      });

      return ceo as CEO;
    });
  }

  /**
   * Parser une ligne CSV (gère les guillemets)
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
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
   * Filtrer les CEO selon les critères
   */
  filterCEOs(ceos: CEO[], filters: ExtractionFilters): CEO[] {
    return ceos.filter(ceo => {
      // Filtre par secteurs d'activité (obligatoire)
      if (filters.industries && filters.industries.length > 0) {
        const ceoIndustry = ceo.Industry?.toLowerCase() || '';
        
        // Vérifier si l'industrie du CEO correspond à au moins une des industries sélectionnées
        const matchesIndustry = filters.industries.some(filterIndustry => 
          ceoIndustry.includes(filterIndustry.toLowerCase())
        );
        
        if (!matchesIndustry) {
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
      if (filters.jobTitle && filters.jobTitle !== 'all') {
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

      return true;
    });
  }

  /**
   * Générer le contenu CSV
   */
  generateCSVContent(ceos: CEO[]): string {
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
   * Télécharger le CSV côté client
   */
  downloadCSV(csvContent: string, filename = 'ceos_filtered.csv'): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  /**
   * Échapper les valeurs CSV
   */
  private escapeCSV(value: string): string {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Processus complet d'extraction
   */
  async performCompleteExtraction(country: string, filters: ExtractionFilters) {
    const { data: user } = await this.supabaseClient.auth.getUser();
    if (!user.user) throw new Error('Utilisateur non connecté');

    // 1. Télécharger et filtrer les CEO
    const allCEOs = await this.downloadCountryCSV(country);
    const filteredCEOs = this.filterCEOs(allCEOs, filters);

    if (filteredCEOs.length === 0) {
      throw new Error('Aucun CEO trouvé avec ces critères');
    }

    // 2. Créer l'enregistrement d'extraction
    const { data: extraction, error } = await this.supabaseClient
      .from('extractions')
      .insert({
        user_id: user.user.id,
        country: country,
        company_type: filters.industries.join(', ') || 'all',
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

    // 3. Sauvegarder le fichier dans le bucket download avec expiration 7 jours
    const csvContent = this.generateCSVContent(filteredCEOs);
    const filename = `${user.user.id}/${extraction.id}.csv`;

    const { error: uploadError } = await this.supabaseClient.storage
      .from('download')
      .upload(filename, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    if (uploadError) {
      console.error('Erreur upload fichier:', uploadError);
      // Ne pas faire échouer l'extraction si l'upload échoue
    }

    // 4. Générer URL signée (7 jours)
    const { data: signedUrl } = await this.supabaseClient.storage
      .from('download')
      .createSignedUrl(filename, 604800); // 7 jours en secondes

    // 5. Mettre à jour l'extraction avec l'URL du fichier
    if (signedUrl?.signedUrl) {
      await this.supabaseClient
        .from('extractions')
        .update({ file_url: signedUrl.signedUrl })
        .eq('id', extraction.id);
    }

    return {
      extraction: { ...extraction, file_url: signedUrl?.signedUrl },
      totalResults: filteredCEOs.length,
      csvContent: csvContent
    };
  }
}