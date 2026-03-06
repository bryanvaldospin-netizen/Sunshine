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
  const { firebaseUser, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si la carga ha terminado y el usuario SÍ existe, redirigir.
    if (!loading && firebaseUser) {
      if (isAdmin) {
        router.replace('/admin-test');
      } else {
        router.replace('/test-page');
      }
    }
  }, [loading, firebaseUser, isAdmin, router]);

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
