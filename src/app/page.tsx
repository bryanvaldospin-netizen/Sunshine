'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import SplashScreen from '@/components/splash-screen';

export default function Home() {
  const { firebaseUser, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (firebaseUser) {
        if (isAdmin) {
            router.replace('/zona-vip');
        } else {
            router.replace('/test-page');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [firebaseUser, loading, isAdmin, router]);

  return <SplashScreen />;
}
