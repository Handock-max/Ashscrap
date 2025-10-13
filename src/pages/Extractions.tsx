import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ExtractionsService } from "@/services/supabase/extractions";
import type { Extraction } from "@/integrations/supabase/types";

export default function Extractions() {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExtractions();
  }, []);

  const loadExtractions = async () => {
    try {
      setLoading(true);
      const data = await ExtractionsService.getUserExtractions({ limit: 50 });
      setExtractions(data);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des extractions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Terminé</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Échoué</Badge>;
      case 'collecting_places':
      case 'searching_people':
      case 'enriching_contacts':
      case 'enriching_linkedin':
      case 'finalizing':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />En cours</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleDownload = (fileUrl: string, extractionId: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `extraction-${extractionId}.csv`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mes Extractions</h1>
          <p className="text-muted-foreground">Historique et téléchargements de vos extractions</p>
        </div>
        <Button onClick={loadExtractions} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {extractions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Aucune extraction trouvée</p>
            <p className="text-sm text-muted-foreground mt-2">
              Lancez votre première extraction depuis le tableau de bord
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {extractions.map((extraction) => (
            <Card key={extraction.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {extraction.company_type} - {extraction.country}
                    </CardTitle>
                    <CardDescription>
                      Créé le {formatDate(extraction.created_at)}
                      {extraction.completed_at && (
                        <> • Terminé le {formatDate(extraction.completed_at)}</>
                      )}
                    </CardDescription>
                  </div>
                  {getStatusBadge(extraction.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Ancienneté</p>
                    <p className="text-sm text-muted-foreground">{extraction.company_age}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Format</p>
                    <p className="text-sm text-muted-foreground">{extraction.file_format?.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Enseignes trouvées</p>
                    <p className="text-sm text-muted-foreground">{extraction.total_places_found || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Contacts enrichis</p>
                    <p className="text-sm text-muted-foreground">{extraction.total_contacts_enriched || 0}</p>
                  </div>
                </div>

                {extraction.status === 'completed' && extraction.file_url && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">Fichier prêt au téléchargement</p>
                      {extraction.expires_at && (
                        <p className="text-xs text-green-600">
                          {isExpired(extraction.expires_at) 
                            ? "⚠️ Lien expiré" 
                            : `Expire le ${formatDate(extraction.expires_at)}`
                          }
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handleDownload(extraction.file_url!, extraction.id)}
                      disabled={isExpired(extraction.expires_at)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                )}

                {extraction.status === 'failed' && extraction.error_message && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-xs text-red-600">{extraction.error_message}</p>
                  </div>
                )}

                {['collecting_places', 'searching_people', 'enriching_contacts', 'enriching_linkedin', 'finalizing'].includes(extraction.status) && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Extraction en cours...</p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${extraction.progress_percentage || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {extraction.progress_percentage || 0}% - {extraction.status}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}