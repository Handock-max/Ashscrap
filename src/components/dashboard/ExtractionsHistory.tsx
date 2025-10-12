import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Extraction {
  id: string;
  country: string;
  company_type: string;
  company_age: string;
  file_format: string;
  status: string;
  file_url: string | null;
  duration: number | null;
  created_at: string;
  completed_at: string | null;
}

export const ExtractionsHistory = () => {
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExtractions = async () => {
      try {
        const { data, error } = await supabase
          .from("extractions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setExtractions(data || []);
      } catch (error) {
        console.error("Error fetching extractions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExtractions();

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
          fetchExtractions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "En cours" },
      completed: { variant: "default", label: "Terminé" },
      error: { variant: "destructive", label: "Erreur" },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <CardDescription>Les 10 dernières extractions lancées</CardDescription>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Durée</TableHead>
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
                      {extraction.country} - {extraction.company_type}
                    </TableCell>
                    <TableCell>{getStatusBadge(extraction.status)}</TableCell>
                    <TableCell>
                      {extraction.duration ? `${extraction.duration}s` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {extraction.file_url ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={extraction.file_url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          En attente
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
