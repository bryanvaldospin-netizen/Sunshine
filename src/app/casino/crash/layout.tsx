'use client';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SplashScreen from '@/components/splash-screen';

export default function CrashLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-900 text-white">
      <div className="flex-1">{children}</div>
    </div>
  );
}
