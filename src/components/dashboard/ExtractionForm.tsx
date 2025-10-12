import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/data/countries";
import { sectors } from "@/data/sectors";
import { KeywordsInput } from "./KeywordsInput";

export const ExtractionForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [companyAge, setCompanyAge] = useState("");
  const [fileFormat, setFileFormat] = useState("");
  const [minSites, setMinSites] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!country || !sector || !companyAge || !fileFormat) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Non authentifié");

      // Create extraction record
      const { error } = await supabase.from("extractions").insert({
        user_id: user.id,
        country,
        company_type: sector,
        company_age: companyAge,
        file_format: fileFormat,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Extraction lancée avec succès !");
      
      // Reset form
      setCountry("");
      setSector("");
      setCompanyAge("");
      setFileFormat("");
      setMinSites("");
      setKeywords([]);
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-glow border-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl">Nouvelle extraction</CardTitle>
        <CardDescription>
          Configurez les paramètres de votre extraction de données
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">Secteur d'activité *</Label>
              <Select value={sector} onValueChange={setSector} disabled={isLoading}>
                <SelectTrigger id="sector">
                  <SelectValue placeholder="Sélectionnez un secteur" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {sectors.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyAge">Ancienneté *</Label>
              <Select value={companyAge} onValueChange={setCompanyAge} disabled={isLoading}>
                <SelectTrigger id="companyAge">
                  <SelectValue placeholder="Sélectionnez l'ancienneté" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-2">0-2 ans</SelectItem>
                  <SelectItem value="2-5">2-5 ans</SelectItem>
                  <SelectItem value="5-10">5-10 ans</SelectItem>
                  <SelectItem value="10+">10+ ans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileFormat">Format de fichier *</Label>
              <Select value={fileFormat} onValueChange={setFileFormat} disabled={isLoading}>
                <SelectTrigger id="fileFormat">
                  <SelectValue placeholder="Sélectionnez un format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minSites">Nombre minimum de sites</Label>
              <Select value={minSites} onValueChange={setMinSites} disabled={isLoading}>
                <SelectTrigger id="minSites">
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
                Filtrer par le nombre de sites/établissements de la franchise ou chaîne
              </p>
            </div>
          </div>

          <KeywordsInput 
            keywords={keywords}
            onChange={setKeywords}
            disabled={isLoading}
          />

          <Button
            type="submit"
            className="w-full gradient-primary text-white hover:opacity-90 transition-opacity shadow-md"
            size="lg"
            disabled={isLoading}
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
        </form>
      </CardContent>
    </Card>
  );
};
