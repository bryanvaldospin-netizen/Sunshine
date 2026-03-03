'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import SplashScreen from '@/components/splash-screen';
import { Header } from '@/components/header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('AppLayout (Protected Route) Check:', {
      loading,
      user: user ? { email: user.email, role: user.rol } : null,
    });
    if (!loading && !user) {
      console.log('AppLayout: No user found after loading. Redirecting to /login.');
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    console.log("AppLayout: Rendering SplashScreen because 'loading' is true or 'user' is null.", { loading, user: !!user });
    return <SplashScreen />;
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </div>
  );
}
