/**
 * Service d'extraction centralisé via Cloudflare Workers
 * Orchestration: OpenStreetMap → Apollo → Kaspr
 */

export interface ExtractionPayload {
  extraction_id: string;
  user_id: string;
  country: string;
  company_type: string;
  company_age: string;
  file_format: string;
  min_sites?: string;
  keywords?: string[];
}

export interface ExtractionResponse {
  success: boolean;
  extraction_id?: string;
  message?: string;
  error?: string;
  status?: string;
}

export interface ExtractionStatus {
  id: string;
  status: 'pending' | 'collecting_places' | 'searching_people' | 'enriching_contacts' | 'enriching_linkedin' | 'finalizing' | 'completed' | 'failed';
  progress_percentage: number;
  current_step?: string;
  total_places_found?: number;
  total_people_found?: number;
  total_contacts_enriched?: number;
  file_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  expires_at: string;
}

export class ExtractionService {
  private static readonly WORKER_URL = import.meta.env.VITE_EXTRACTION_WORKER_URL;
  private static readonly TIMEOUT = 30000; // 30 secondes

  /**
   * Lance une nouvelle extraction via Cloudflare Worker
   */
  static async startExtraction(payload: ExtractionPayload): Promise<ExtractionResponse> {
    if (!this.WORKER_URL) {
      console.warn('VITE_EXTRACTION_WORKER_URL non configuré');
      return { success: false, error: 'Worker URL non configurée' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(`${this.WORKER_URL}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: result.success || false,
        extraction_id: result.extraction_id,
        message: result.message || 'Extraction démarrée',
        status: result.status
      };

    } catch (error: any) {
      console.error('Erreur Cloudflare Worker:', error);
      
      if (error.name === 'AbortError') {
        return { success: false, error: 'Timeout de l\'extraction' };
      }
      
      return { 
        success: false, 
        error: error.message || 'Erreur inconnue de l\'extraction' 
      };
    }
  }

  /**
   * Récupère le statut d'une extraction
   */
  static async getExtractionStatus(extractionId: string): Promise<ExtractionStatus | null> {
    if (!this.WORKER_URL) {
      console.warn('VITE_EXTRACTION_WORKER_URL non configuré');
      return null;
    }

    try {
      const response = await fetch(`${this.WORKER_URL}/status?extraction_id=${extractionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur récupération statut:', error);
      return null;
    }
  }

  /**
   * Crée le payload d'extraction à partir des données du formulaire
   */
  static createExtractionPayload(
    extractionId: string,
    userId: string,
    formData: {
      country: string;
      company_type: string;
      company_age: string;
      file_format: string;
      min_sites?: string;
      keywords?: string[];
    }
  ): ExtractionPayload {
    return {
      extraction_id: extractionId,
      user_id: userId,
      country: formData.country,
      company_type: formData.company_type,
      company_age: formData.company_age,
      file_format: formData.file_format,
      min_sites: formData.min_sites,
      keywords: formData.keywords && formData.keywords.length > 0 ? formData.keywords : undefined,
    };
  }

  /**
   * Valide les données avant envoi
   */
  static validatePayload(payload: ExtractionPayload): boolean {
    const required = [
      payload.extraction_id,
      payload.user_id,
      payload.country,
      payload.company_type,
      payload.company_age,
      payload.file_format,
    ];

    return required.every(field => field && field.trim().length > 0);
  }

  /**
   * Test de connectivité avec le worker
   */
  static async testWorker(): Promise<ExtractionResponse> {
    const testPayload: ExtractionPayload = {
      extraction_id: 'test-' + Date.now(),
      user_id: 'test-user',
      country: 'France',
      company_type: 'Restaurant',
      company_age: '5-10',
      file_format: 'csv',
      keywords: ['test']
    };

    return this.startExtraction(testPayload);
  }

  /**
   * Polling du statut d'extraction avec callback
   */
  static async pollExtractionStatus(
    extractionId: string,
    onUpdate: (status: ExtractionStatus) => void,
    intervalMs: number = 5000
  ): Promise<void> {
    const poll = async () => {
      const status = await this.getExtractionStatus(extractionId);
      if (status) {
        onUpdate(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          return; // Arrêter le polling
        }
      }
      
      setTimeout(poll, intervalMs);
    };
    
    poll();
  }
}