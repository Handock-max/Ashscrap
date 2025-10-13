import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, RefreshCw, FileText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CountryData {
  country_code: string;
  country_name: string;
  total_profiles: number;
  unique_job_titles: number;
  last_updated: string;
}

interface StorageFile {
  name: string;
  updated_at: string;
  metadata: {
    size: number;
  };
}

export const CountryManager = () => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingCountry, setProcessingCountry] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadCountries(), loadStorageFiles()]);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const { data, error } = await supabase.rpc('get_countries_with_job_titles');
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Erreur chargement pays:', error);
      toast.error('Erreur lors du chargement des pays');
    }
  };

  const loadStorageFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('extractions')
        .list('', { limit: 100 });
      
      if (error) throw error;
      setStorageFiles(data?.filter(file => file.name.endsWith('.csv')) || []);
    } catch (error) {
      console.error('Erreur chargement fichiers:', error);
      toast.error('Erreur lors du chargement des fichiers');
    }
  };

  const processCSVFile = async (fileName: string) => {
    const countryName = fileName.replace('.csv', '');
    setProcessingCountry(countryName);
    
    try {
      // Télécharger le fichier CSV
      const { data: csvBlob, error: downloadError } = await supabase.storage
        .from('extractions')
        .download(fileName);

      if (downloadError) throw downloadError;

      // Convertir en texte
      const csvText = await csvBlob.text();
      
      // Parser le CSV pour extraire les postes
      const jobTitles = parseCSVForJobTitles(csvText);
      
      if (jobTitles.length === 0) {
        throw new Error('Aucun poste trouvé dans le fichier CSV');
      }

      // Calculer le total des profils
      const totalProfiles = jobTitles.reduce((sum, job) => sum + job.count, 0);

      // Sauvegarder dans la base de données
      const { error: saveError } = await supabase.rpc('process_country_job_titles', {
        country_input: countryName.toLowerCase(),
        job_titles_json: jobTitles,
        total_profiles_count: totalProfiles
      });

      if (saveError) throw saveError;

      toast.success(`${countryName} traité avec succès: ${jobTitles.length} postes uniques, ${totalProfiles} profils`);
      
      // Recharger les données
      await loadCountries();
      
    } catch (error: any) {
      console.error('Erreur traitement CSV:', error);
      toast.error(`Erreur lors du traitement de ${countryName}: ${error.message}`);
    } finally {
      setProcessingCountry(null);
    }
  };

  const parseCSVForJobTitles = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Trouver l'index de la colonne Title
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const titleIndex = headers.findIndex(h => h.toLowerCase().includes('title'));
    
    if (titleIndex === -1) return [];

    // Compter les occurrences de chaque titre
    const titleCounts = new Map<string, number>();
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const title = values[titleIndex];
      
      if (title && title.length > 0) {
        titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
      }
    }

    // Convertir en format attendu et trier par count décroissant
    return Array.from(titleCounts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
  };

  const deleteCountry = async (countryCode: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer les données pour ${countryCode} ?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('remove_country_data', {
        file_path: `${countryCode}.csv`
      });

      if (error) throw error;

      toast.success(`Données supprimées pour ${countryCode}`);
      await loadCountries();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  const getUnprocessedFiles = () => {
    return storageFiles.filter(file => {
      const countryName = file.name.replace('.csv', '').toLowerCase();
      return !countries.some(country => country.country_code === countryName);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestion des Pays
          </CardTitle>
          <CardDescription>
            Gérez les fichiers CSV et les données des pays pour les extractions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={loadData} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Chargement...' : 'Actualiser'}
            </Button>
          </div>

          {/* Fichiers non traités */}
          {getUnprocessedFiles().length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-orange-600">
                Fichiers CSV non traités ({getUnprocessedFiles().length})
              </h3>
              <div className="grid gap-2">
                {getUnprocessedFiles().map((file) => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <span className="font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({Math.round(file.metadata.size / 1024)} KB)
                      </span>
                    </div>
                    <Button
                      onClick={() => processCSVFile(file.name)}
                      disabled={processingCountry === file.name.replace('.csv', '')}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {processingCountry === file.name.replace('.csv', '') ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Traiter
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pays traités */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Pays disponibles ({countries.length})
            </h3>
            {countries.length === 0 ? (
              <p className="text-muted-foreground">Aucun pays traité pour le moment</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pays</TableHead>
                    <TableHead>Profils</TableHead>
                    <TableHead>Postes uniques</TableHead>
                    <TableHead>Dernière MAJ</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.map((country) => (
                    <TableRow key={country.country_code}>
                      <TableCell className="font-medium">
                        {country.country_name}
                        <Badge variant="secondary" className="ml-2">
                          {country.country_code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {country.total_profiles.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>{country.unique_job_titles}</TableCell>
                      <TableCell>
                        {new Date(country.last_updated).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => deleteCountry(country.country_code)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};