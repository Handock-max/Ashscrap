import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = "Une erreur s'est produite",
  description = "Quelque chose s'est mal passé. Veuillez réessayer ou contacter le support si le problème persiste.",
  showHomeButton = true
}) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-3 bg-gray-100 rounded-md">
              <p className="text-sm font-mono text-gray-800 break-all">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer">
                    Stack trace
                  </summary>
                  <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {resetError && (
              <Button onClick={resetError} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            )}
            <Button variant="outline" onClick={handleReload} className="w-full">
              Recharger la page
            </Button>
            {showHomeButton && (
              <Button variant="ghost" onClick={handleGoHome} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Hook pour utiliser l'error fallback avec React Error Boundary
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by error handler:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
};