'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/logo';
import SplashScreen from '@/components/splash-screen';


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = '/test-page';
    }
  }, [user, loading]);

  if (loading || user) {
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
