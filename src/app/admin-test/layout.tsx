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
    if (!loading) {
      if (!firebaseUser) {
        // Not logged in, redirect to login page
        router.replace('/login');
      } else if (user && user.rol !== 'admin') {
        // Logged in but not an admin, redirect to user dashboard
        toast({
          variant: 'destructive',
          title: 'Acceso restringido',
          description: 'Solo personal autorizado puede acceder a esta área.',
        });
        router.replace('/test-page');
      }
    }
  }, [user, firebaseUser, loading, router, toast]);

  if (loading || !user || user.rol !== 'admin') {
    // Show splash screen while loading or before redirecting
    return <SplashScreen />;
  }

  // User is an admin, render the content
  return <>{children}</>;
}
