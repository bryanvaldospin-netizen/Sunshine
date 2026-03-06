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
  const { firebaseUser, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && firebaseUser) {
        router.replace(isAdmin ? '/admin-test' : '/test-page');
    }
  }, [loading, firebaseUser, router, isAdmin]);

  if (loading || firebaseUser) {
    return <SplashScreen />;
  }

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
