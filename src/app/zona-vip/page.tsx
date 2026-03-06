'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SplashScreen from '@/components/splash-screen';

const ADMIN_UID = 'daNNsN4y5lgsTtrioMXNXcX24ZH2';

export default function ZonaVipPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        // Not logged in, redirect to login
        router.replace('/login');
      } else if (firebaseUser.uid !== ADMIN_UID) {
        // Logged in but not the admin, redirect to test page
        router.replace('/test-page');
      }
    }
  }, [loading, firebaseUser, router]);

  // While loading, or if the user is not the correct admin yet, show a splash screen.
  if (loading || !firebaseUser || firebaseUser.uid !== ADMIN_UID) {
    return <SplashScreen />;
  }

  // If we are here, user is loaded and is the admin
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
      <h1 className="text-5xl font-bold">Bienvenido Jefe Brayan</h1>
    </div>
  );
}
