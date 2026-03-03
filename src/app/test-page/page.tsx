'use client';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SplashScreen from '@/components/splash-screen';

export default function TestPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <SplashScreen />;
  }

  // If loading is false, proceed. user can be null here if Firestore read failed.
  // We use a default value of 0 for the balance to prevent crashes and avoid redirects.
  const balance = user?.saldoUSDT ?? 0;

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(balance);

  return (
    <main className="bg-gray-900 text-white min-h-screen flex items-center justify-center font-body p-4">
      <div className="w-full max-w-sm">
        <Card className="bg-gray-800 border-golden text-white text-center">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-gray-300">
              {t('dashboard.balance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <p className="text-6xl font-bold text-golden">{formattedBalance}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
