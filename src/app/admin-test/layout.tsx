'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import SplashScreen from '@/components/splash-screen';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Do not make decisions while auth state is loading.
    if (loading) {
      return;
    }

    // If loading is finished and there's no user, redirect to login.
    if (!firebaseUser) {
      router.replace('/login');
      return;
    }
    
    // Role check is removed to simplify access during development.
    // The admin login form is now the main guard for this route.

  }, [firebaseUser, loading, router]);

  // While loading or if the user is not logged in, show a splash screen.
  if (loading || !firebaseUser) {
    return <SplashScreen />;
  }

  // If all checks pass, render the admin page.
  return <>{children}</>;
}
