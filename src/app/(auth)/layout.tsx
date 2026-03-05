'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/logo';
import SplashScreen from '@/components/splash-screen';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la carga ha terminado y el usuario SÍ existe, redirigir a la app.
    if (!loading && firebaseUser) {
      router.replace('/test-page');
    }
  }, [loading, firebaseUser, router]);

  // Muestra una pantalla de carga mientras se verifica la sesión o antes de redirigir.
  if (loading || firebaseUser) {
    return <SplashScreen />;
  }

  // Si no hay usuario, muestra el contenido de login/registro.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-8">
        <Logo />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </main>
  );
}
