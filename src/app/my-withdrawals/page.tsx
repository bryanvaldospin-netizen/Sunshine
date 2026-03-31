'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/header';
import SplashScreen from '@/components/splash-screen';


export default function MyWithdrawalsPage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/login');
    }
  }, [loading, firebaseUser, router]);

  if (loading || !firebaseUser) {
    return <SplashScreen />;
  }

  // This page's content has been moved to the main dashboard.
  // This file is kept to prevent build errors from stale references, but it renders nothing.
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{null}</div>
    </div>
  );
}
