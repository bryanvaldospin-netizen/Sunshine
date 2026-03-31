'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white p-4">
      <Card className="w-full max-w-lg bg-gray-800 border-destructive text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Algo salió mal</CardTitle>
          <CardDescription className="text-gray-400">
            Ocurrió un error inesperado en la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="bg-gray-900 p-4 rounded-md">
                <p className="text-sm text-red-400 font-mono">{error.message}</p>
            </div>
          <Button
            onClick={
              // Attempt to recover by trying to re-render the segment
              () => reset()
            }
            className="w-full bg-gradient-to-r from-golden to-red-800 text-white"
          >
            Intentar de nuevo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
