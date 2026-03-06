'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import SplashScreen from '@/components/splash-screen';

export default function AdminTestPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      // If loading is finished and user is not an admin,
      // redirect them to the main test page.
      router.replace('/test-page');
    }
  }, [loading, isAdmin, router]);

  // While loading, or if the user is not an admin (before redirect), show a splash screen.
  if (loading || !isAdmin) {
    return <SplashScreen />;
  }

  // If the user is an admin, show the admin dashboard content.
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Panel de Administrador</CardTitle>
          <CardDescription>Bienvenido, {user?.name}. Aquí podrás gestionar la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
            <p>Próximamente: ¡Herramientas de gestión!</p>
        </CardContent>
      </Card>
    </div>
  );
}
