import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const BrandingSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyName, setCompanyName] = useState("WorkFlow Hub");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#8b5cf6");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .single();

      if (data) {
        setCompanyName(data.company_name || "WorkFlow Hub");
        setPrimaryColor(data.primary_color || "#3b82f6");
        setSecondaryColor(data.secondary_color || "#8b5cf6");
        setLogoUrl(data.logo_url || "");
      }
    } catch (error) {
      // Settings don't exist yet, use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // First try to update
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({
          company_name: companyName,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl,
        })
        .eq("id", "00000000-0000-0000-0000-000000000000");

      // If no rows affected, insert instead
      if (updateError) {
        const { error: insertError } = await supabase
          .from("app_settings")
          .insert({
            id: "00000000-0000-0000-0000-000000000000",
            company_name: companyName,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            logo_url: logoUrl,
          });

        if (insertError) throw insertError;
      }

      toast.success("Paramètres enregistrés avec succès");
    } catch (error: any) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-glow border-primary/10">
      <CardHeader>
        <CardTitle>Personnalisation de l'application</CardTitle>
        <CardDescription>
          Modifiez l'apparence et le branding de l'application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nom de l'entreprise</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="WorkFlow Hub"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL du logo</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://exemple.com/logo.png"
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Couleur primaire</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={isSaving}
                  className="w-20 h-10"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Couleur secondaire</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={isSaving}
                  className="w-20 h-10"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-white"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
