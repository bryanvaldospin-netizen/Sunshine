'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import SplashScreen from '@/components/splash-screen';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, firebaseUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // No tomar decisiones mientras el estado de autenticación se está cargando.
    if (loading) {
      return;
    }

    // Si la carga ha finalizado y no hay usuario, redirigir al login.
    if (!firebaseUser) {
      router.replace('/login');
      return;
    }

    // Si hay un usuario, pero su perfil de Firestore (con el rol) aún no se ha cargado
    // o si su rol no es 'admin', redirigirlo.
    if (user && user.rol !== 'admin') {
      toast({
        variant: 'destructive',
        title: 'Acceso restringido',
        description: 'Solo personal autorizado puede acceder a esta área.',
      });
      router.replace('/test-page');
    }
  }, [user, firebaseUser, loading, router, toast]);

  // Mientras se carga o si el usuario no es un administrador válido, muestra una pantalla de carga.
  // Esto previene mostrar la página de admin brevemente a usuarios no autorizados antes de la redirección.
  if (loading || !firebaseUser || !user || user.rol !== 'admin') {
    return <SplashScreen />;
  }

  // Si todas las validaciones pasan, el usuario es un admin verificado.
  return <>{children}</>;
}
