import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, Users, Building2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/data/countries";
import { apolloIndustries } from "@/data/apollo-industries";
import { KeywordsInput } from "./KeywordsInput";
import { CEOExtractionService, type JobTitle } from "@/services/ceo-extraction";

export const ExtractionForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTitles, setLoadingTitles] = useState(false);
  
  // Champs obligatoires
  const [country, setCountry] = useState("");
  const [verifiedEmailOnly, setVerifiedEmailOnly] = useState(true);
  const [employeeCount, setEmployeeCount] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  
  // Champs optionnels
  const [keywords, setKeywords] = useState<string[]>([]);
  const [retailLocations, setRetailLocations] = useState("");
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  
  // Données dynamiques
  const [availableJobTitles, setAvailableJobTitles] = useState<JobTitle[]>([]);
  const [ceoService] = useState(() => new CEOExtractionService(supabase));

  // Charger les postes disponibles quand le pays change
  useEffect(() => {
    if (country) {
      loadJobTitlesForCountry(country);
    } else {
      setAvailableJobTitles([]);
      setSelectedJobTitle("");
    }
  }, [country]);

  const loadJobTitlesForCountry = async (countryValue: string) => {
    setLoadingTitles(true);
    try {
      // Récupérer les postes depuis la table job_titles_by_country
      const { data, error } = await supabase.rpc('get_job_titles_for_country', {
        country_input: countryValue
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Aucun poste trouvé pour ce pays. Le pays n\'a peut-être pas encore été traité par un administrateur.');
      }

      // Convertir le format JSONB en JobTitle[]
      const jobTitles: JobTitle[] = data.map((item: any) => ({
        title: item.title,
        count: item.count
      }));

      setAvailableJobTitles(jobTitles);
      
      toast.success(`${jobTitles.length} postes uniques trouvés pour ${countries.find(c => c.value === countryValue)?.label}`);
    } catch (error: any) {
      console.error('Erreur lors du chargement des postes:', error);
      toast.error(`Impossible de charger les postes pour ce pays: ${error.message}`);
      setAvailableJobTitles([]);
    } finally {
      setLoadingTitles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation des champs obligatoires
    if (!country) {
      toast.error("Veuillez sélectionner un pays");
      return;
    }
    if (!employeeCount) {
      toast.error("Veuillez sélectionner le nombre d'employés");
      return;
    }
    if (selectedIndustries.length === 0) {
      toast.error("Veuillez sélectionner au moins un secteur d'activité");
      return;
    }

    setIsLoading(true);

    try {
      // Construire les filtres pour l'extraction
      const filters = {
        industries: selectedIndustries,
        companySize: employeeCount,
        hasEmail: true,
        verifiedEmailOnly: verifiedEmailOnly,
        keywords: keywords,
        retailLocations: retailLocations,
        jobTitle: selectedJobTitle
      };

      // Lancer l'extraction complète
      const result = await ceoService.performCompleteExtraction(country, filters);

      toast.success(`Extraction terminée ! ${result.totalResults} résultats trouvés`);

      // Télécharger automatiquement le fichier
      if (result.csvContent) {
        const countryLabel = countries.find(c => c.value === country)?.label || country;
        const filename = `ceos_${countryLabel}_${new Date().toISOString().split('T')[0]}.csv`;
        ceoService.downloadCSV(result.csvContent, filename);
      }

      // Reset form
      resetForm();
      
    } catch (error: any) {
      console.error('Erreur extraction:', error);
      toast.error(error.message || "Une erreur est survenue lors de l'extraction");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCountry("");
    setEmployeeCount("");
    setSelectedIndustries([]);
    setKeywords([]);
    setRetailLocations("");
    setSelectedJobTitle("");
    setAvailableJobTitles([]);
  };

  const handleIndustrySelect = (industryValue: string) => {
    if (selectedIndustries.includes(industryValue)) {
      // Retirer l'industrie si déjà sélectionnée
      setSelectedIndustries(prev => prev.filter(ind => ind !== industryValue));
    } else if (selectedIndustries.length < 5) {
      // Ajouter l'industrie si moins de 5 sélectionnées
      setSelectedIndustries(prev => [...prev, industryValue]);
    } else {
      toast.error("Vous pouvez sélectionner au maximum 5 secteurs d'activité");
    }
  };

  const removeIndustry = (industryValue: string) => {
    setSelectedIndustries(prev => prev.filter(ind => ind !== industryValue));
  };

  return (
    <Card className="shadow-glow border-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl">Extraction CEO Apollo</CardTitle>
        <CardDescription>
          Configurez vos critères pour extraire les données CEO depuis Apollo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champs obligatoires */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Critères obligatoires</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="country">Pays *</Label>
                <Select value={country} onValueChange={setCountry} disabled={isLoading}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Sélectionnez un pays" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countries.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingTitles && country && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Chargement des postes disponibles...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeCount">Nombre d'employés *</Label>
                <Select value={employeeCount} onValueChange={setEmployeeCount} disabled={isLoading}>
                  <SelectTrigger id="employeeCount">
                    <SelectValue placeholder="Sélectionnez la taille" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employés</SelectItem>
                    <SelectItem value="11-50">11-50 employés</SelectItem>
                    <SelectItem value="51-200">51-200 employés</SelectItem>
                    <SelectItem value="200+">200+ employés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="industry">Secteurs d'activité * (max 5)</Label>
                
                {/* Industries sélectionnées */}
                {selectedIndustries.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                    {selectedIndustries.map((industryValue) => {
                      const industry = apolloIndustries.find(ind => ind.value === industryValue);
                      return (
                        <div key={industryValue} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm border border-blue-300 dark:border-blue-700">
                          <span>{industry?.label}</span>
                          <X 
                            className="h-3 w-3 cursor-pointer text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" 
                            onClick={() => removeIndustry(industryValue)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sélecteur d'industries */}
                <Select 
                  value="" 
                  onValueChange={handleIndustrySelect} 
                  disabled={isLoading || selectedIndustries.length >= 5}
                >
                  <SelectTrigger id="industry">
                    <SelectValue placeholder={
                      selectedIndustries.length >= 5 
                        ? "Maximum 5 secteurs sélectionnés" 
                        : selectedIndustries.length === 0
                        ? "Sélectionnez un secteur d'activité"
                        : `Ajouter un secteur (${selectedIndustries.length}/5)`
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {apolloIndustries
                      .filter(ind => !selectedIndustries.includes(ind.value))
                      .map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          <div className="flex items-center gap-2">
                            <Plus className="h-3 w-3" />
                            {ind.label}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                <p className="text-xs text-muted-foreground">
                  Secteurs d'activité Apollo - Sélectionnez jusqu'à 5 secteurs pour élargir votre recherche
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="verifiedEmail"
                checked={verifiedEmailOnly}
                onCheckedChange={setVerifiedEmailOnly}
                disabled={isLoading}
              />
              <Label htmlFor="verifiedEmail" className="text-sm">
                Emails vérifiés uniquement (recommandé)
              </Label>
            </div>
          </div>

          {/* Champs optionnels */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Filtres optionnels</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="retailLocations">Nombre de sites retail</Label>
                <Select value={retailLocations} onValueChange={setRetailLocations} disabled={isLoading}>
                  <SelectTrigger id="retailLocations">
                    <SelectValue placeholder="Nombre de sites (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 site minimum</SelectItem>
                    <SelectItem value="2-5">2-5 sites</SelectItem>
                    <SelectItem value="6-10">6-10 sites</SelectItem>
                    <SelectItem value="11-20">11-20 sites</SelectItem>
                    <SelectItem value="21-50">21-50 sites</SelectItem>
                    <SelectItem value="50+">50+ sites</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Filtrer par le nombre de points de vente/établissements
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle">Poste spécifique</Label>
                <Select 
                  value={selectedJobTitle} 
                  onValueChange={setSelectedJobTitle} 
                  disabled={isLoading || !country || availableJobTitles.length === 0}
                >
                  <SelectTrigger id="jobTitle">
                    <SelectValue placeholder={
                      !country ? "Sélectionnez d'abord un pays" :
                      availableJobTitles.length === 0 ? "Aucun poste disponible" :
                      "Tous les postes"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">Tous les postes</SelectItem>
                    {availableJobTitles.map((job) => (
                      <SelectItem key={job.title} value={job.title}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{job.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {job.count}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableJobTitles.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {availableJobTitles.length} postes uniques disponibles dans ce pays
                  </p>
                )}
              </div>
            </div>

            <KeywordsInput
              keywords={keywords}
              onChange={setKeywords}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white hover:opacity-90 transition-opacity shadow-md"
            size="lg"
            disabled={isLoading || !country || !employeeCount || selectedIndustries.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Extraction en cours...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Lancer l'extraction
              </>
            )}
          </Button>

          {/* Informations sur les résultats attendus */}
          {country && availableJobTitles.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Données disponibles pour {countries.find(c => c.value === country)?.label}</span>
              </div>
              <p className="text-sm text-blue-700">
                {availableJobTitles.reduce((sum, job) => sum + job.count, 0)} profils au total • 
                {availableJobTitles.length} postes différents
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
