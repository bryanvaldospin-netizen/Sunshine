'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import SplashScreen from '@/components/splash-screen';

const ADMIN_UID = 'daNNsN4y5lgsTtrioMXNXcX24ZH2';

export default function Home() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (firebaseUser) {
        if (firebaseUser.uid === ADMIN_UID) {
          router.replace('/zona-vip');
        } else {
          router.replace('/test-page');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [firebaseUser, loading, router]);

  return <SplashScreen />;
}
