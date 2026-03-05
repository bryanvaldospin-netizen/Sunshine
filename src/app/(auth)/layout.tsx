'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Logo } from '@/components/logo';
import SplashScreen from '@/components/splash-screen';


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
       // Simplified logic: always redirect any logged-in user to the main test page.
       // The admin can navigate to the admin login manually.
      router.replace('/test-page');
    }
  }, [user, loading, router]);

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
