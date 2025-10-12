import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TestTube, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ExtractionService } from "@/services/webhook";

export const WebhookTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastTest, setLastTest] = useState<{
    success: boolean;
    message: string;
    timestamp: string;
  } | null>(null);

  const handleTestWorker = async () => {
    setIsLoading(true);

    try {
      const result = await ExtractionService.testWorker();

      setLastTest({
        success: result.success,
        message: result.success ? result.message! : result.error!,
        timestamp: new Date().toLocaleString('fr-FR'),
      });

      if (result.success) {
        toast.success("Cloudflare Worker testé avec succès !");
      } else {
        toast.error(`Erreur Worker: ${result.error}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Erreur inconnue";
      setLastTest({
        success: false,
        message: errorMessage,
        timestamp: new Date().toLocaleString('fr-FR'),
      });
      toast.error(`Erreur test Worker: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const workerUrl = import.meta.env.VITE_EXTRACTION_WORKER_URL;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Test Cloudflare Worker
        </CardTitle>
        <CardDescription>
          Testez la connectivité avec le worker d'extraction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">URL du Worker :</div>
          <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
            {workerUrl || "Non configuré (VITE_EXTRACTION_WORKER_URL)"}
          </div>
        </div>

        {lastTest && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Dernier test :</div>
            <div className="flex items-center gap-2">
              {lastTest.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <Badge variant={lastTest.success ? "default" : "destructive"}>
                {lastTest.success ? "Succès" : "Échec"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {lastTest.timestamp}
              </span>
            </div>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {lastTest.message}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleTestWorker}
            disabled={isLoading || !workerUrl}
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Tester le Worker
              </>
            )}
          </Button>
        </div>

        {!workerUrl && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Configurez la variable VITE_EXTRACTION_WORKER_URL pour activer les extractions
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};