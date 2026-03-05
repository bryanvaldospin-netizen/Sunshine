'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/header';
import SplashScreen from '@/components/splash-screen';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la carga ha terminado y no hay usuario, redirigir al login.
    if (!loading && !firebaseUser) {
      router.replace('/login');
    }
  }, [loading, firebaseUser, router]);

  // Mientras carga o si no hay usuario (antes de la redirección), muestra una pantalla de carga.
  if (loading || !firebaseUser) {
    return <SplashScreen />;
  }

  // Si el usuario está autenticado, muestra el layout de la aplicación.
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </div>
  );
}
