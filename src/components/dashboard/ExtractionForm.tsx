import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Rocket, Users, Building2, X, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/data/countries";
import { apolloIndustries } from "@/data/apollo-industries";
import { KeywordsInput } from "./KeywordsInput";
import { CEOExtractionService, type CEO } from "@/services/ceo-extraction";

export const ExtractionForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Champs obligatoires
  const [country, setCountry] = useState("");
  const [verifiedEmailOnly, setVerifiedEmailOnly] = useState(true);
  const [employeeCount, setEmployeeCount] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  // Champs optionnels
  const [keywords, setKeywords] = useState<string[]>([]);
  const [retailLocations, setRetailLocations] = useState("");
  const [selectedJobTitles, setSelectedJobTitles] = useState<string[]>([]);

  // Données dynamiques chargées depuis le CSV
  const [availableIndustries, setAvailableIndustries] = useState<{ industry: string, count: number }[]>([]);
  const [availableJobTitles, setAvailableJobTitles] = useState<{ title: string, count: number }[]>([]);
  const [allCEOs, setAllCEOs] = useState<CEO[]>([]);
  const [ceoService] = useState(() => new CEOExtractionService(supabase));

  // Charger les données CSV quand le pays change
  useEffect(() => {
    if (country) {
      loadCountryData(country);
    } else {
      resetCountryData();
    }
  }, [country]);

  const loadCountryData = async (countryValue: string) => {
    setLoadingData(true);
    try {
      // Charger le CSV complet du pays
      const ceos = await ceoService.downloadCountryCSV(countryValue);
      setAllCEOs(ceos);

      // Extraire les industries uniques avec leur nombre d'occurrences
      const industryMap = new Map<string, number>();
      ceos.forEach(ceo => {
        const industry = ceo.Industry?.trim();
        if (industry) {
          industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
        }
      });

      const industries = Array.from(industryMap.entries())
        .map(([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count);

      setAvailableIndustries(industries);

      // Extraire les postes uniques avec leur nombre d'occurrences
      const jobTitleMap = new Map<string, number>();
      ceos.forEach(ceo => {
        const title = ceo.Title?.trim();
        if (title) {
          jobTitleMap.set(title, (jobTitleMap.get(title) || 0) + 1);
        }
      });

      const jobTitles = Array.from(jobTitleMap.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count);

      setAvailableJobTitles(jobTitles);

      const countryLabel = countries.find(c => c.value === countryValue)?.label || countryValue;
      toast.success(`Données chargées pour ${countryLabel}: ${ceos.length} profils, ${industries.length} industries, ${jobTitles.length} postes`);

    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error);
      toast.error(`Impossible de charger les données pour ce pays: ${error.message}`);
      resetCountryData();
    } finally {
      setLoadingData(false);
    }
  };

  const resetCountryData = () => {
    setAllCEOs([]);
    setAvailableIndustries([]);
    setAvailableJobTitles([]);
    setSelectedIndustries([]);
    setSelectedJobTitles([]);
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

    if (allCEOs.length === 0) {
      toast.error("Les données du pays ne sont pas encore chargées");
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
        jobTitles: selectedJobTitles
      };

      // Filtrer les CEOs avec les données déjà chargées
      const filteredCEOs = ceoService.filterCEOs(allCEOs, filters);

      if (filteredCEOs.length === 0) {
        toast.error("Aucun CEO trouvé avec ces critères");
        return;
      }

      // Générer et télécharger le CSV
      const csvContent = ceoService.generateCSVContent(filteredCEOs);
      const countryLabel = countries.find(c => c.value === country)?.label || country;
      const filename = ceoService.generateFilename(countryLabel, selectedIndustries);
      
      ceoService.downloadCSV(csvContent, filename);

      toast.success(`Extraction terminée ! ${filteredCEOs.length} résultats trouvés et téléchargés`);

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
    setSelectedJobTitles([]);
    setVerifiedEmailOnly(true);
    resetCountryData();
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

  const handleJobTitleSelect = (jobTitle: string) => {
    if (selectedJobTitles.includes(jobTitle)) {
      // Retirer le poste si déjà sélectionné
      setSelectedJobTitles(prev => prev.filter(job => job !== jobTitle));
    } else if (selectedJobTitles.length < 5) {
      // Ajouter le poste si moins de 5 sélectionnés
      setSelectedJobTitles(prev => [...prev, jobTitle]);
    } else {
      toast.error("Vous pouvez sélectionner au maximum 5 postes");
    }
  };

  const removeJobTitle = (jobTitle: string) => {
    setSelectedJobTitles(prev => prev.filter(job => job !== jobTitle));
  };

  // Filtrer les postes selon les industries sélectionnées
  const getFilteredJobTitles = () => {
    if (selectedIndustries.length === 0) {
      return availableJobTitles;
    }

    // Filtrer les CEOs par industries sélectionnées
    const filteredCEOs = allCEOs.filter(ceo => {
      const ceoIndustry = ceo.Industry?.toLowerCase() || '';
      return selectedIndustries.some(industry => 
        ceoIndustry.includes(industry.toLowerCase())
      );
    });

    // Extraire les postes uniques de ces CEOs filtrés
    const jobTitleMap = new Map<string, number>();
    filteredCEOs.forEach(ceo => {
      const title = ceo.Title?.trim();
      if (title) {
        jobTitleMap.set(title, (jobTitleMap.get(title) || 0) + 1);
      }
    });

    return Array.from(jobTitleMap.entries())
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count);
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
                {loadingData && country && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Chargement des données du pays...
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
                      const industry = availableIndustries.find(ind => ind.industry === industryValue);
                      return (
                        <div key={industryValue} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm border border-blue-300 dark:border-blue-700">
                          <span>{industryValue}</span>
                          {industry && (
                            <span className="text-xs opacity-75">({industry.count})</span>
                          )}
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
                    {availableIndustries
                      .filter(ind => !selectedIndustries.includes(ind.industry))
                      .map((ind) => (
                        <SelectItem key={ind.industry} value={ind.industry}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Plus className="h-3 w-3" />
                              <span>{ind.industry}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {ind.count} profils
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  {availableIndustries.length > 0
                    ? `${availableIndustries.length} industries disponibles pour ce pays - Sélectionnez jusqu'à 5 secteurs`
                    : "Sélectionnez d'abord un pays pour voir les industries disponibles"
                  }
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
                <Label htmlFor="jobTitle">Postes spécifiques (max 5)</Label>

                {/* Postes sélectionnés */}
                {selectedJobTitles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                    {selectedJobTitles.map((jobTitle) => {
                      const job = availableJobTitles.find(j => j.title === jobTitle);
                      return (
                        <div key={jobTitle} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm border border-blue-300 dark:border-blue-700">
                          <span>{jobTitle}</span>
                          {job && (
                            <span className="text-xs opacity-75">({job.count})</span>
                          )}
                          <X
                            className="h-3 w-3 cursor-pointer text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => removeJobTitle(jobTitle)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sélecteur de postes */}
                <Select
                  value=""
                  onValueChange={handleJobTitleSelect}
                  disabled={isLoading || !country || getFilteredJobTitles().length === 0 || selectedJobTitles.length >= 5}
                >
                  <SelectTrigger id="jobTitle">
                    <SelectValue placeholder={
                      !country ? "Sélectionnez d'abord un pays" :
                        selectedIndustries.length === 0 ? "Sélectionnez d'abord des industries" :
                          getFilteredJobTitles().length === 0 ? "Aucun poste pour ces industries" :
                            selectedJobTitles.length >= 5 ? "Maximum 5 postes sélectionnés" :
                              selectedJobTitles.length === 0 ? "Sélectionnez un poste" :
                                `Ajouter un poste (${selectedJobTitles.length}/5)`
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {getFilteredJobTitles()
                      .filter(job => !selectedJobTitles.includes(job.title))
                      .map((job) => (
                        <SelectItem key={job.title} value={job.title}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Plus className="h-3 w-3" />
                              <span className="truncate">{job.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {job.count}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">
                  {selectedIndustries.length === 0 
                    ? "Sélectionnez d'abord des industries pour voir les postes correspondants"
                    : getFilteredJobTitles().length > 0
                    ? `${getFilteredJobTitles().length} postes disponibles pour les industries sélectionnées`
                    : "Aucun poste trouvé pour ces industries"
                  }
                </p>
              </div>
            </div>

            <KeywordsInput
              keywords={keywords}
              onChange={setKeywords}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={resetForm}
              disabled={isLoading || loadingData}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
            
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white hover:opacity-90 transition-opacity shadow-md"
              size="lg"
              disabled={isLoading || loadingData || !country || !employeeCount || selectedIndustries.length === 0 || allCEOs.length === 0}
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
          </div>

          {/* Informations sur les résultats attendus */}
          {country && allCEOs.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Données disponibles pour {countries.find(c => c.value === country)?.label}</span>
              </div>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  {allCEOs.length} profils au total • 
                  {availableIndustries.length} industries • 
                  {availableJobTitles.length} postes différents
                </p>
                {selectedIndustries.length > 0 && (
                  <p>
                    {getFilteredJobTitles().reduce((sum, job) => sum + job.count, 0)} profils pour les industries sélectionnées • 
                    {getFilteredJobTitles().length} postes correspondants
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
