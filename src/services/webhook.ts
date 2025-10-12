/**
 * Service webhook centralisé pour les intégrations externes
 * Point d'entrée principal pour les workflows d'extraction
 */

export interface WebhookPayload {
  timestamp: string;
  extraction_id: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
  extraction_request: {
    country: string;
    company_type: string;
    company_age: string;
    file_format: string;
    min_sites: string | null;
    keywords: string[] | null;
  };
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class WebhookService {
  private static readonly WEBHOOK_URL = import.meta.env.VITE_WEBHOOK;
  private static readonly TIMEOUT = 10000; // 10 secondes

  /**
   * Envoie les données d'extraction au webhook N8N
   * Point d'entrée principal du workflow
   */
  static async sendExtractionWebhook(payload: WebhookPayload): Promise<WebhookResponse> {
    if (!this.WEBHOOK_URL) {
      console.warn('VITE_WEBHOOK non configuré - webhook ignoré');
      return { success: false, error: 'Webhook URL non configurée' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WorkflowHub/1.0',
          'X-Webhook-Source': 'extraction-form',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json().catch(() => ({}));
      
      return {
        success: true,
        message: result.message || 'Webhook envoyé avec succès',
      };

    } catch (error: any) {
      console.error('Erreur webhook N8N:', error);
      
      if (error.name === 'AbortError') {
        return { success: false, error: 'Timeout du webhook' };
      }
      
      return { 
        success: false, 
        error: error.message || 'Erreur inconnue du webhook' 
      };
    }
  }

  /**
   * Crée le payload webhook à partir des données du formulaire
   */
  static createExtractionPayload(
    extractionId: string,
    user: { id: string; email: string; full_name?: string },
    formData: {
      country: string;
      company_type: string;
      company_age: string;
      file_format: string;
      min_sites?: string;
      keywords?: string[];
    }
  ): WebhookPayload {
    return {
      timestamp: new Date().toISOString(),
      extraction_id: extractionId,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name || null,
      },
      extraction_request: {
        country: formData.country,
        company_type: formData.company_type,
        company_age: formData.company_age,
        file_format: formData.file_format,
        min_sites: formData.min_sites || null,
        keywords: formData.keywords && formData.keywords.length > 0 ? formData.keywords : null,
      },
    };
  }

  /**
   * Valide les données avant envoi du webhook
   */
  static validatePayload(payload: WebhookPayload): boolean {
    const required = [
      payload.extraction_id,
      payload.user.id,
      payload.user.email,
      payload.extraction_request.country,
      payload.extraction_request.company_type,
      payload.extraction_request.company_age,
      payload.extraction_request.file_format,
    ];

    return required.every(field => field && field.trim().length > 0);
  }

  /**
   * Envoie un webhook de test pour vérifier la connectivité
   */
  static async testWebhook(): Promise<WebhookResponse> {
    const testPayload: WebhookPayload = {
      timestamp: new Date().toISOString(),
      extraction_id: 'test-' + Date.now(),
      user: {
        id: 'test-user',
        email: 'test@example.com',
        full_name: 'Test User',
      },
      extraction_request: {
        country: 'France',
        company_type: 'Test',
        company_age: '5-10',
        file_format: 'csv',
        min_sites: null,
        keywords: null,
      },
    };

    return this.sendExtractionWebhook(testPayload);
  }
}