import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTokenAuth } from "@/hooks/use-token-auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Extraction {
  id: string;
  country: string;
  company_type: string;
  file_format: string;
  status: string;
  file_url: string | null;
  duration: number | null;
  total_results: number | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  filters: any;
  user_id: string;
}

export const ExtractionsHistory = () => {
  const { userData, isAdmin, isLoading: authLoading } = useTokenAuth();
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchExtractions = async () => {
      if (authLoading || !userData?.userId) return;

      try {

        let query = supabase
          .from("extractions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);

        // Si pas admin, filtrer par user_id
        if (!isAdmin) {
          query = query.eq("user_id", userData.userId).limit(10);
        }

        const { data, error } = await query;

        if (error) throw error;
        setExtractions(data || []);

        // Si admin, récupérer les noms des utilisateurs
        if (isAdmin && data && data.length > 0) {
          const userIds = [...new Set(data.map((extraction: Extraction) => extraction.user_id))].filter(Boolean) as string[];
          await loadUserNames(userIds);
        }
      } catch (error) {
        console.error("Error fetching extractions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const loadUserNames = async (userIds: string[]) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (error) throw error;

        const namesMap: Record<string, string> = {};
        data?.forEach(profile => {
          // Priorité : full_name puis email, pas d'ID en fallback
          if (profile.full_name) {
            namesMap[profile.id] = profile.full_name;
          } else if (profile.email) {
            namesMap[profile.id] = profile.email;
          }
          // Si ni full_name ni email, on ne met rien dans la map
        });

        setUserNames(namesMap);
      } catch (error) {
        console.error('Erreur chargement noms utilisateurs:', error);
      }
    };

    if (!authLoading) {
      fetchExtractions();
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel("extractions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "extractions",
        },
        () => {
          if (!authLoading) {
            fetchExtractions();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, userData, isAdmin]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "En attente" },
      processing: { variant: "outline", label: "En cours" },
      completed: { variant: "default", label: "Terminé" },
      failed: { variant: "destructive", label: "Erreur" },
      error: { variant: "destructive", label: "Erreur" },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatExtractionType = (extraction: Extraction) => {
    const countryName = extraction.country;
    const industries = extraction.filters?.industries;

    if (industries && Array.isArray(industries) && industries.length > 0) {
      const industryCount = industries.length;
      return `${countryName} - ${industryCount} secteur${industryCount > 1 ? 's' : ''}`;
    }

    return `${countryName} - ${extraction.company_type || 'Tous secteurs'}`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Historique des extractions</CardTitle>
        <CardDescription>
          {isAdmin
            ? "Les 20 dernières extractions de tous les utilisateurs"
            : "Vos 10 dernières extractions"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {extractions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune extraction pour le moment
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Extraction</TableHead>
                  {isAdmin && <TableHead>Utilisateur</TableHead>}
                  <TableHead>Résultats</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractions.map((extraction) => (
                  <TableRow key={extraction.id}>
                    <TableCell className="font-medium">
                      {format(new Date(extraction.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{formatExtractionType(extraction)}</div>
                        {extraction.filters?.companySize && (
                          <div className="text-xs text-muted-foreground">
                            {extraction.filters.companySize} employés
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="text-sm">
                          {userNames[extraction.user_id] || '-'}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {extraction.total_results ? (
                        <span className="font-medium text-green-600">
                          {extraction.total_results} résultats
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(extraction.status)}</TableCell>
                    <TableCell className="text-right">
                      {extraction.status === 'completed' && extraction.file_url ? (
                        isExpired(extraction.expires_at) ? (
                          <Button size="sm" variant="outline" disabled>
                            <Download className="h-4 w-4 mr-2" />
                            Expiré
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <a href={extraction.file_url} download>
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </a>
                          </Button>
                        )
                      ) : extraction.status === 'failed' ? (
                        <Button size="sm" variant="outline" disabled>
                          Échec
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          En cours
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
