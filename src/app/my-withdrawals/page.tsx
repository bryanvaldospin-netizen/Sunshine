'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SplashScreen from '@/components/splash-screen';


export default function MyWithdrawalsPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (firebaseUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [loading, firebaseUser, router]);

  return <SplashScreen />;
}
