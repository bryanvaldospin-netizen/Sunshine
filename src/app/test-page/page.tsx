'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { UserProfile, Investment } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getWalletAddress } from '@/lib/actions';
import { Copy, Globe, Gem, Shield, Crown, Zap, Star, PiggyBank, TrendingUp, CircleDollarSign, LogOut, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import TradingViewTicker from '@/components/trading-view-ticker';


const FlagsMarquee = () => {
    const flags = [
        "🇪🇨", "🇺🇸", "🇪🇸", "🇯🇵", "🇧🇷", "🇨🇦", "🇩🇪", "🇫🇷", "🇮🇹", "🇦🇺", "🇬🇧", "🇨🇳", "🇮🇳", "🇷🇺", "🇿🇦",
        "🇲🇽", "🇦🇷", "🇨🇴", "🇵🇪", "🇨🇱", "🇰🇷", "🇳🇬", "🇪🇬", "🇸🇪", "🇳🇴", "🇩🇰", "🇫🇮", "🇨🇭", "🇵🇹", "🇮🇪"
    ];
    
    return (
        <footer className="fixed bottom-0 left-0 right-0 w-full bg-black/80 backdrop-blur-sm z-50">
            <div className="relative flex w-full overflow-hidden">
                <div className="flex animate-marquee whitespace-nowrap py-3">
                    {flags.map((flag, index) => (
                        <span key={`marquee1-${index}`} className="text-4xl mx-4">{flag}</span>
                    ))}
                </div>

                <div className="absolute top-0 flex animate-marquee2 whitespace-nowrap py-3">
                    {flags.map((flag, index) => (
                        <span key={`marquee2-${index}`} className="text-4xl mx-4">{flag}</span>
                    ))}
                </div>
            </div>
        </footer>
    );
};

const InvestmentPlans = ({ userProfile }: { userProfile: UserProfile | null }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<{name: string, investment: string, min: number} | null>(null);
    const [walletAddress, setWalletAddress] = useState('');

    useEffect(() => {
        getWalletAddress().then(setWalletAddress);
    }, []);

    const handleCopy = () => {
        if (!walletAddress) return;
        navigator.clipboard.writeText(walletAddress);
        toast({ title: t('dashboard.copy'), description: t('dashboard.copied') });
    };

    const handleContinue = () => {
        window.open('https://form.jotform.com/260646464495063', '_blank');
        setOpen(false);
    };

    const plans = [
        { name: 'Nivel 1 (Bronce)', investment: 'Desde $20', min: 20, icon: Shield, color: 'border-bronze', textColor: 'text-bronze' },
        { name: 'Nivel 2 (Plata)', investment: 'Desde $30', min: 30, icon: Star, color: 'border-silver', textColor: 'text-silver' },
        { name: 'Nivel 3 (Oro)', investment: 'Desde $50', min: 50, icon: Zap, color: 'border-golden', textColor: 'text-golden' },
        { name: 'Nivel 4 (Platino)', investment: 'Desde $100', min: 100, icon: Crown, color: 'border-platinum', textColor: 'text-platinum' },
        { name: 'Nivel 5 (Diamante)', investment: 'Hasta $5,000', min: 1000, icon: Gem, color: 'border-diamond', textColor: 'text-diamond' },
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Card className="bg-gray-800 border-gray-700 text-white w-full">
                <CardHeader>
                    <CardTitle>Planes de Inversión</CardTitle>
                    <CardDescription>Selecciona un plan para comenzar a invertir.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {plans.map((plan) => (
                        <Card key={plan.name} className={`bg-gray-900/50 flex flex-col ${plan.color} border-2`}>
                            <CardHeader className="items-center text-center">
                                <plan.icon className={`w-10 h-10 mb-2 ${plan.textColor}`} />
                                <CardTitle className={`text-lg ${plan.textColor}`}>{plan.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow text-center">
                                <p className="text-2xl font-bold">
                                    <span className="text-white">{plan.investment.split(' ')[0]}</span>{' '}
                                    <span className="text-white">{plan.investment.split(' ')[1]}</span>
                                </p>
                            </CardContent>
                            <CardFooter>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setSelectedPlan(plan)} className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
                                        Seleccionar Plan
                                    </Button>
                                </DialogTrigger>
                            </CardFooter>
                        </Card>
                    ))}
                </CardContent>
            </Card>

            <DialogContent className="bg-gray-800 border-golden text-white">
                <DialogHeader>
                    <DialogTitle>Realizar Depósito para {selectedPlan?.name}</DialogTitle>
                    <DialogDescription>
                        Transfiere el monto a la billetera USDT (TRC-20) y luego haz clic en el botón para completar tu solicitud en nuestro formulario seguro.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="wallet-address">0xe37a298c740caf1411cbccda7b250a0664a00129</Label>
                        <div className="flex items-center gap-2">
                            <Input id="wallet-address" readOnly value={walletAddress} className="bg-gray-700 border-gray-600 truncate" placeholder={t('dashboard.loadingAddress')}/>
                            <Button variant="outline" size="icon" onClick={handleCopy} className="border-golden text-golden hover:bg-golden/10 hover:text-golden flex-shrink-0">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <Button onClick={handleContinue} className="w-full bg-gradient-to-r from-golden to-red-800 text-white text-lg py-6">
                      Completar Solicitud de Depósito
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const ActivePlanCard = ({ plan, loading, user }: { plan: Investment | null, loading: boolean, user: UserProfile | null }) => {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!plan) return;

    const intervalId = setInterval(() => {
      const now = new Date();
      const nextPaymentDate = new Date(plan.nextPaymentDate);
      const startDate = new Date(plan.startDate);
      
      const distance = nextPaymentDate.getTime() - now.getTime();

      if (distance < 0) {
        setCountdown(t('dashboard.processingPayment'));
        setProgress(100);
        clearInterval(intervalId);
        return;
      }
      
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setCountdown(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);

      const totalDuration = nextPaymentDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const currentProgress = (elapsed / totalDuration) * 100;
      setProgress(Math.min(currentProgress, 100));

    }, 1000);

    return () => clearInterval(intervalId);
  }, [plan, t]);

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <Skeleton className="h-6 w-1/2 bg-gray-700" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full bg-gray-700" />
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    if (user && user.saldoUSDT > 0) {
      return (
        <Card className="bg-gray-800 border-gray-700 text-white flex items-center justify-center p-6">
            <Button variant="outline" className="border-golden text-golden hover:bg-golden/10 hover:text-golden">
                {t('dashboard.viewPlans')}
            </Button>
        </Card>
      );
    }
    return null; // Don't show anything if no balance and no plan
  }

  return (
     <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{t('dashboard.activePlan')}: {plan.planName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
           <Progress value={progress} className="w-full h-2 bg-gray-700 [&>div]:bg-golden" />
           <p className="text-xs text-right text-gray-400 mt-1">{progress.toFixed(0)}{t('dashboard.completed')}</p>
        </div>
        <div className="text-center">
            <p className="text-sm text-gray-400">{t('dashboard.nextPayment')}</p>
            <p className="text-2xl font-bold font-mono text-golden">{countdown}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const DailyBonusCard = ({ user }: { user: UserProfile }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const canClaim = () => {
        if (!user.ultimoCheckIn) return true;
        const lastCheckInDate = new Date(user.ultimoCheckIn);
        const today = new Date();
        return lastCheckInDate.toDateString() !== today.toDateString();
    };

    const handleClaim = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const today = new Date();
            const dayOfWeek = today.getDay(); // Sunday is 0, Saturday is 6
            const bonus = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.00 : 0.50;
            
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                saldoUSDT: user.saldoUSDT + bonus,
                ultimoCheckIn: today.toISOString()
            });

            toast({
                title: '¡Felicidades!',
                description: `Has recibido tu bono de ${bonus.toFixed(2)} USDT de hoy.`
            });

        } catch (error) {
            console.error("Error claiming daily bonus: ", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo reclamar el bono. Inténtalo de nuevo.'
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const isClaimable = canClaim();

    return (
        <Card className="bg-gray-800 border-gray-700 text-white w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gift className="text-green-400" />
                    Bono de Check-in Diario
                </CardTitle>
                <CardDescription>¡Reclama tu recompensa por visitar Sunshine cada día!</CardDescription>
            </CardHeader>
            <CardContent>
                <Button 
                    onClick={handleClaim} 
                    disabled={!isClaimable || isLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg py-6 disabled:opacity-50 disabled:bg-gray-600 hover:from-green-600 hover:to-emerald-700"
                >
                    {isLoading ? 'Procesando...' : isClaimable ? 'Reclamar Bono Diario' : 'Vuelve Mañana'}
                </Button>
            </CardContent>
        </Card>
    );
};


export default function TestPage() {
  const { user: profile, loading: authLoading } = useAuth();
  const { t, setLocale } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();

  const [stats, setStats] = useState({ totalInvested: 0, earnings: 0, withdrawals: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<Investment | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Effect for Stats, based on real-time profile
  useEffect(() => {
    if (profile) {
      setStats({
        totalInvested: profile.saldoUSDT,
        earnings: 0, // Placeholder
        withdrawals: 0, // Placeholder
      });
      setStatsLoading(false);
    } else if (!authLoading) {
      // No profile, not loading, so finish loading stats
      setStats({ totalInvested: 0, earnings: 0, withdrawals: 0 });
      setStatsLoading(false);
    }
  }, [profile, authLoading]);

  // Effect for Chart Data, based on real-time profile.saldoUSDT
  useEffect(() => {
    if (authLoading) return; // Wait for auth to be resolved

    if (!profile) {
      setChartData([]); // Clear data if user logs out or has no profile
      return;
    }

    const newBalance = profile.saldoUSDT;
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    setChartData(prevData => {
      // On first load with a balance, simulate history
      if (prevData.length === 0 && newBalance > 0) {
        const simulatedData = [];
        const points = 7;
        for (let i = 0; i < points - 1; i++) {
          const pastTime = new Date(now.getTime() - (points - 1 - i) * 60000 * 30); // 30 mins apart
          const randomFactor = 0.8 + Math.random() * 0.2;
          simulatedData.push({
            date: pastTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            balance: Math.max(0, (newBalance / points) * (i + 1) * randomFactor),
          });
        }
        // Add the actual current balance as the last point
        simulatedData.push({
          date: timeLabel,
          balance: newBalance,
        });
        return simulatedData;
      }

      // Do nothing if chart is empty and balance is 0
      if (prevData.length === 0 && newBalance === 0) {
        return [];
      }

      // Add a new data point only if the balance has changed
      const lastBalance = prevData.length > 0 ? prevData[prevData.length - 1].balance : -1;
      if (newBalance !== lastBalance) {
        // Avoid adding duplicate time entries if balance updates quickly
        const lastTime = prevData.length > 0 ? prevData[prevData.length - 1].date : null;
        if (lastTime === timeLabel) {
          const updatedData = [...prevData];
          updatedData[updatedData.length - 1] = { date: timeLabel, balance: newBalance };
          return updatedData; // Replace last point instead of adding a new one
        }
        return [...prevData, { date: timeLabel, balance: newBalance }];
      }

      return prevData; // No change
    });
  }, [profile, authLoading]); // Reruns whenever the profile (with saldoUSDT) from useAuth changes

  // Effect for Active Plan
  useEffect(() => {
    if (profile?.uid) {
      setPlanLoading(true);
      const investmentsQuery = query(
        collection(db, 'investments'),
        where('userId', '==', profile.uid),
        where('status', '==', 'Activo'),
        limit(1)
      );

      const unsubscribe = onSnapshot(
        investmentsQuery,
        (planSnapshot) => {
          if (!planSnapshot.empty) {
            const planDoc = planSnapshot.docs[0];
            setActivePlan({ id: planDoc.id, ...planDoc.data() } as Investment);
          } else {
            setActivePlan(null);
          }
          setPlanLoading(false);
        },
        (error) => {
          console.error('Error fetching active plan:', error);
          toast({
            variant: 'destructive',
            title: 'Error de Plan',
            description: 'No se pudo cargar la información de tu plan activo.',
          });
          setPlanLoading(false);
        }
      );

      return () => unsubscribe();
    } else if (!authLoading) {
      // Not loading and no user, so stop loading and clear plan
      setPlanLoading(false);
      setActivePlan(null);
    }
  }, [profile?.uid, authLoading, toast]);

  const statItems = useMemo(() => [
    { title: t('dashboard.totalInvestment'), value: stats.totalInvested, icon: PiggyBank },
    { title: t('dashboard.generatedEarnings'), value: stats.earnings, icon: TrendingUp },
    { title: t('dashboard.totalWithdrawals'), value: stats.withdrawals, icon: CircleDollarSign },
  ], [t, stats]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const balance = profile?.saldoUSDT ?? 0;
  const userName = profile?.name || t('dashboard.investor');

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  const formattedBalance = formatCurrency(balance);

  const chartConfig = {
    balance: {
      label: 'Saldo',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;


  return (
    <main className="bg-gray-900 text-white min-h-screen font-body relative pb-24">
       <header className="bg-black/50 backdrop-blur-sm sticky top-0 z-50">
         <div className="container mx-auto flex h-16 items-center justify-end gap-2 px-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700 w-9 h-9 p-0">
                        <Globe className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                    <DropdownMenuItem onClick={() => setLocale('es')} className="focus:bg-gray-700 cursor-pointer">Español</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocale('en')} className="focus:bg-gray-700 cursor-pointer">English</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
                <LogOut className="mr-2 h-4 w-4" />
                {t('profile.logout')}
            </Button>
          </div>
        <TradingViewTicker />
      </header>

      <div className="p-4 md:p-8">
        <div className="flex flex-col items-center justify-start w-full h-full pt-8 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">{t('dashboard.greeting', { name: userName })}</h1>
            </div>
            
            <div className="w-full max-w-5xl">
              <Card className="bg-gray-800 border-golden text-white text-center">
                <CardHeader>
                  <CardTitle className="text-xl font-medium text-gray-300">
                    {t('dashboard.balance')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-6">
                  {authLoading ? (
                     <Skeleton className="h-16 w-1/2 mx-auto bg-gray-700" />
                  ) : (
                    <p className="text-6xl font-bold text-golden">{formattedBalance}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {profile && !authLoading && (
              <div className="w-full max-w-5xl">
                <DailyBonusCard user={profile} />
              </div>
            )}
            
            <div className="w-full max-w-5xl">
                <Card className="bg-gray-800 border-gray-700 text-white">
                    <CardHeader>
                        <CardTitle>Información de Cuenta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                         {authLoading ? (
                           <p className="text-gray-400">Cargando datos...</p>
                        ) : profile ? (
                            <ul className="space-y-2 text-sm list-none">
                                <li><strong className="text-gray-400 font-medium w-36 inline-block">Nombre:</strong> {profile.name}</li>
                                <li><strong className="text-gray-400 font-medium w-36 inline-block">Correo:</strong> {profile.email}</li>
                                <li className="flex items-center">
                                    <strong className="text-gray-400 font-medium w-36 inline-block flex-shrink-0">Billetera de Retiro (TRC-20):</strong>
                                    {profile.walletAddress ? (
                                        <div className="flex items-center min-w-0 flex-1">
                                            <span className="font-mono text-white truncate" title={profile.walletAddress}>{profile.walletAddress}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (profile.walletAddress) {
                                                        navigator.clipboard.writeText(profile.walletAddress);
                                                        toast({ title: 'Billetera copiada', description: 'La dirección de tu billetera ha sido copiada al portapapeles.' });
                                                    }
                                                }}
                                                className="h-7 w-7 ml-2 text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">N/A</span>
                                    )}
                                </li>
                                <li className="flex items-center">
                                    <strong className="text-gray-400 font-medium w-36 inline-block flex-shrink-0">Código Invitación:</strong>
                                    {profile.inviteCode ? (
                                        <>
                                            <span className="font-mono text-golden">{profile.inviteCode}</span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => {
                                                if (!profile.inviteCode) return;
                                                navigator.clipboard.writeText(profile.inviteCode);
                                                toast({ title: t('profile.codeCopied'), description: t('profile.codeCopiedDesc') });
                                              }}
                                              className="h-7 w-7 ml-2 text-gray-400 hover:text-golden hover:bg-gray-700"
                                            >
                                              <Copy className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <span className="text-gray-500">N/A</span>
                                    )}
                                </li>
                                <li><strong className="text-gray-400 font-medium w-36 inline-block">Saldo Actual:</strong> {formattedBalance}</li>
                                <li className="flex items-start">
                                    <strong className="text-gray-400 font-medium w-36 inline-block flex-shrink-0">UID:</strong>
                                    <span className="break-all">{profile.uid}</span>
                                </li>
                            </ul>
                        ) : (
                            <p className="text-gray-500">No se pudo cargar la información del perfil.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="w-full max-w-5xl">
               {statsLoading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                    <Skeleton className="h-28 bg-gray-800" />
                    <Skeleton className="h-28 bg-gray-800" />
                    <Skeleton className="h-28 bg-gray-800" />
                </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                    {statItems.map((item, index) => (
                        <Card key={index} className="bg-gray-800 border-gray-700 text-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-400">{item.title}</CardTitle>
                                <item.icon className="h-5 w-5 text-golden" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(item.value)}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
               )}
            </div>
            
            <div className="w-full max-w-5xl">
                <InvestmentPlans userProfile={profile} />
            </div>

            <div className="w-full max-w-5xl">
                <Card className="bg-gray-800 border-gray-700 text-white">
                    <CardHeader>
                        <CardTitle>{t('dashboard.balanceGrowth')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 h-[290px] flex items-center justify-center">
                      {statsLoading ? (
                        <Skeleton className="w-full h-full bg-gray-700" />
                      ) : chartData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="rgba(255, 255, 255, 0.4)"
                                    fontSize={12}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="rgba(255, 255, 255, 0.4)"
                                    fontSize={12}
                                    tickFormatter={(value) => formatCurrency(value as number)}
                                    domain={['dataMin - 100', 'dataMax + 100']}
                                />
                                <ChartTooltip 
                                    cursor={true}
                                    content={<ChartTooltipContent
                                        indicator="line"
                                        formatter={(value) => [formatCurrency(value as number), 'Saldo Acumulado']}
                                        labelClassName="text-white"
                                        className="bg-gray-900 border-golden"
                                    />}
                                />
                                <Area 
                                    dataKey="balance"
                                    type="monotone" 
                                    strokeWidth={2}
                                    stroke="hsl(var(--primary))"
                                    fill="url(#colorBalance)" 
                                />
                            </AreaChart>
                        </ChartContainer>
                      ) : (
                        <p className="text-muted-foreground text-center">
                          {t('dashboard.growthHistoryPlaceholder')}
                        </p>
                      )}
                    </CardContent>
                </Card>
            </div>

            <div className="w-full max-w-5xl">
              <ActivePlanCard plan={activePlan} loading={planLoading} user={profile} />
            </div>
          </div>
        </div>
        <FlagsMarquee />
    </main>
  );
}
