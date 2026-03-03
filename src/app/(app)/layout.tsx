'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import SplashScreen from '@/components/splash-screen';
import { Header } from '@/components/header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/login');
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return <SplashScreen />;
  }

  if (!firebaseUser) {
    return <SplashScreen />;
  }


  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </div>
  );
}
