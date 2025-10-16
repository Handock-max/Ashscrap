import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import { TokenAuthService } from "@/services/tokenAuth";
import { themePresets, getThemeById, type ThemePreset } from "@/data/themes";

export const BrandingSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyName, setCompanyName] = useState("Ash Scrap");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [primaryColor, setPrimaryColor] = useState("#eab308");
  const [secondaryColor, setSecondaryColor] = useState("#2563eb");
  const [logoUrl, setLogoUrl] = useState("");
  const [showCustomColors, setShowCustomColors] = useState(false);
  const { setBrandingSettings } = useUIStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userData = TokenAuthService.getUserData();
      if (!userData) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_branding_settings")
        .select("*")
        .eq("user_id", userData.userId)
        .single();

      if (data) {
        setCompanyName(data.company_name || "Ash Scrap");
        setSelectedTheme(data.theme_preset || "default");
        setPrimaryColor(data.primary_color || "#eab308");
        setSecondaryColor(data.secondary_color || "#2563eb");
        setLogoUrl(data.logo_url || "");
        setShowCustomColors(data.theme_preset === "custom");
      }
    } catch (error) {
      // Settings don't exist yet, use defaults
      console.log("Aucun paramètre personnalisé trouvé, utilisation des valeurs par défaut");
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    
    if (themeId === "custom") {
      setShowCustomColors(true);
    } else {
      setShowCustomColors(false);
      const theme = getThemeById(themeId);
      if (theme) {
        setPrimaryColor(theme.primaryColor);
        setSecondaryColor(theme.secondaryColor);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const userData = TokenAuthService.getUserData();
      if (!userData) {
        toast.error("Utilisateur non connecté");
        return;
      }

      // Essayer de mettre à jour les paramètres existants
      const { error: updateError } = await supabase
        .from("user_branding_settings")
        .update({
          company_name: companyName,
          theme_preset: selectedTheme,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userData.userId);

      // Si aucune ligne affectée, insérer un nouveau paramètre
      if (updateError) {
        const { error: insertError } = await supabase
          .from("user_branding_settings")
          .insert({
            user_id: userData.userId,
            company_name: companyName,
            theme_preset: selectedTheme,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            logo_url: logoUrl,
          });

        if (insertError) throw insertError;
      }

      // Mettre à jour le store UI avec les nouveaux paramètres
      setBrandingSettings({
        companyName,
        primaryColor,
        secondaryColor,
        logoUrl
      });

      // Appliquer les couleurs immédiatement via CSS custom properties
      const root = document.documentElement;
      root.style.setProperty('--primary-color', primaryColor);
      root.style.setProperty('--secondary-color', secondaryColor);
      root.style.setProperty('--color-primary', primaryColor);
      root.style.setProperty('--color-secondary', secondaryColor);

      toast.success("Vos paramètres personnalisés ont été enregistrés avec succès !");
    } catch (error: any) {
      console.error("Erreur lors de l'enregistrement:", error);
      toast.error("Erreur lors de l'enregistrement des paramètres");
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
        <CardTitle>Mes paramètres de personnalisation</CardTitle>
        <CardDescription>
          Personnalisez l'apparence de l'application pour votre compte uniquement. Ces paramètres n'affectent que votre expérience utilisateur.
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
              placeholder="Ash Scrap"
              disabled={isSaving}
            />
          </div>

          {/* Sélection de thèmes prédéfinis */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <Label className="text-base font-medium">Choisissez un thème</Label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {themePresets.map((theme) => (
                <div
                  key={theme.id}
                  className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
                    selectedTheme === theme.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleThemeSelect(theme.id)}
                >
                  {selectedTheme === theme.id && (
                    <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className="h-8 w-full rounded mb-2"
                    style={{ background: theme.preview.gradient }}
                  />
                  
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                  </div>
                </div>
              ))}
            </div>
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

          {/* Personnalisation avancée - visible seulement si "Personnalisé" est sélectionné */}
          {showCustomColors && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Couleurs personnalisées</Label>
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
              
              {/* Aperçu en temps réel */}
              <div className="space-y-2">
                <Label>Aperçu</Label>
                <div className="flex items-center gap-4 p-3 border rounded">
                  <div
                    className="h-8 w-16 rounded"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  />
                  <div className="space-y-1">
                    <span style={{ color: primaryColor }} className="font-bold">Ash</span>{' '}
                    <span style={{ color: secondaryColor }} className="font-bold">Scrap</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full gradient-primary text-white hover:opacity-90 transition-opacity"
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
