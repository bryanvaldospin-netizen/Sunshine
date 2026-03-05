'use client';

import { useState, useEffect, useMemo, useId } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { UserProfile, Investment } from '@/types';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getWalletAddress, submitDeposit, submitTestDeposit, logoutUser } from '@/lib/actions';
import { Copy, Upload, Globe, Gem, Shield, Crown, Zap, Star, PiggyBank, TrendingUp, CircleDollarSign, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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


const depositFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0.' }),
  proof: z
    .any()
    .refine((files) => files?.length == 1, 'Debes subir un comprobante.')
    .refine((files) => files?.[0]?.size <= 5000000, `El tamaño máximo del archivo es 5MB.`),
});

const InvestmentPlans = ({ userProfile }: { userProfile: UserProfile | null }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<{name: string, investment: string, min: number} | null>(null);
    const [walletAddress, setWalletAddress] = useState('');
    const descriptionId = useId();
    const user = userProfile;

    useEffect(() => {
        getWalletAddress().then(setWalletAddress);
    }, []);

    const form = useForm<z.infer<typeof depositFormSchema>>({
        resolver: zodResolver(depositFormSchema),
        defaultValues: { amount: '' as any, proof: undefined },
    });
    
    async function onSubmit(values: z.infer<typeof depositFormSchema>) {
        if (!selectedPlan) {
            toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un plan primero.' });
            return;
        }

        if (values.amount < selectedPlan.min) {
            toast({ variant: 'destructive', title: 'Monto Inválido', description: `El monto mínimo para el plan ${selectedPlan.name} es ${selectedPlan.min} USDT.` });
            return;
        }

        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para realizar un depósito.' });
            return;
        }
        
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('userId', user.uid);
        formData.append('userName', user.name);
        formData.append('amount', values.amount.toString());
        formData.append('proof', values.proof[0]);
        formData.append('planName', selectedPlan.name);
        
        try {
            const result = await submitDeposit(formData);

            if (result?.error) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Error al subir el comprobante', 
                    description: result.error
                });
            } else {
                toast({ title: 'Solicitud enviada con éxito', description: 'Tu comprobante está siendo revisado.' });
                form.reset();
                setOpen(false);
            }
        } catch(error: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Error inesperado', 
                description: 'Ocurrió un problema al enviar el formulario. Revisa la consola.' 
            });
            console.error("Error en submit:", error);
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleCopy = () => {
        if (!walletAddress) return;
        navigator.clipboard.writeText(walletAddress);
        toast({ title: t('dashboard.copy'), description: t('dashboard.copied') });
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
                                <p className="text-2xl font-bold">{plan.investment}</p>
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

            <DialogContent aria-describedby={descriptionId} className="bg-gray-800 border-golden text-white">
                <DialogHeader>
                    <DialogTitle>Realizar Depósito para {selectedPlan?.name}</DialogTitle>
                    <DialogDescription id={descriptionId}>
                        Transfiere el monto exacto a la billetera USDT (TRC-20) a continuación y sube el comprobante de la transacción.
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
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('dashboard.amount')}</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder={`${selectedPlan?.min || 100}.00`} {...field} className="bg-gray-700 border-gray-600" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="proof"
                          render={({ field: { onChange, onBlur, name, ref } }) => (
                            <FormItem>
                              <FormLabel>{t('dashboard.proof')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                    <Button asChild variant="outline" className="w-full border-dashed border-gray-500 hover:border-golden text-gray-300">
                                        <label htmlFor="proof-upload" className="cursor-pointer flex items-center justify-center">
                                            <Upload className="mr-2 h-4 w-4" />
                                            <span className="truncate">{form.watch('proof')?.[0]?.name || t('dashboard.selectFile')}</span>
                                        </label>
                                    </Button>
                                    <Input 
                                        id="proof-upload"
                                        type="file" 
                                        className="hidden" 
                                        accept="*/*"
                                        onBlur={onBlur}
                                        name={name}
                                        ref={ref}
                                        onChange={(e) => onChange(e.target.files)}
                                    />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white text-lg py-6" disabled={isSubmitting}>
                          {isSubmitting ? t('dashboard.sending') : t('dashboard.sendProof')}
                        </Button>
                      </form>
                    </Form>
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

  useEffect(() => {
    if (profile?.uid) {
      const fetchData = async () => {
        setStatsLoading(true);
        setPlanLoading(true);
        try {
          // Chart and Stats Data
          const depositsQuery = query(
            collection(db, 'deposit_requests'),
            where('userId', '==', profile.uid),
            where('status', '==', 'Aprobado'),
            orderBy('date', 'asc')
          );
          
          const querySnapshot = await getDocs(depositsQuery);
          const approvedDeposits = querySnapshot.docs.map(doc => doc.data() as { amount: number, date: string });

          let accumulatedBalance = 0;
          const processedChartData = approvedDeposits.map(deposit => {
            accumulatedBalance += deposit.amount;
            return {
              date: new Date(deposit.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
              balance: accumulatedBalance,
            };
          });
          setChartData(processedChartData);

          setStats({
            totalInvested: accumulatedBalance,
            earnings: 0, // Placeholder
            withdrawals: 0, // Placeholder
          });
          
          // Active Plan Data
          const investmentsQuery = query(
            collection(db, 'investments'),
            where('userId', '==', profile.uid),
            where('status', '==', 'Activo'),
            limit(1)
          );
          const planSnapshot = await getDocs(investmentsQuery);
          if (!planSnapshot.empty) {
            const planDoc = planSnapshot.docs[0];
            setActivePlan({ id: planDoc.id, ...planDoc.data() } as Investment);
          } else {
            setActivePlan(null);
          }

        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        } finally {
          setStatsLoading(false);
          setPlanLoading(false);
        }
      };

      fetchData();
    }
  }, [profile]);

  const statItems = useMemo(() => [
    { title: t('dashboard.totalInvestment'), value: stats.totalInvested, icon: PiggyBank },
    { title: t('dashboard.generatedEarnings'), value: stats.earnings, icon: TrendingUp },
    { title: t('dashboard.totalWithdrawals'), value: stats.withdrawals, icon: CircleDollarSign },
  ], [t, stats]);


  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  const handleTestDeposit = async () => {
    toast({ title: 'Enviando depósito de prueba...' });
    const result = await submitTestDeposit();
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error en depósito de prueba', description: result.error });
    } else {
      toast({ title: 'Depósito de prueba enviado', description: 'Revisa el panel de administrador para aprobarlo.' });
    }
  };
  
  const loading = authLoading;
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
    <main className="bg-gray-900 text-white min-h-screen font-body p-4 md:p-8 relative">
       <div className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-2">
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

      <div className="flex flex-col items-center justify-start w-full h-full pt-16 sm:pt-8 space-y-8">
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
              {loading ? (
                 <Skeleton className="h-16 w-1/2 mx-auto bg-gray-700" />
              ) : (
                <p className="text-6xl font-bold text-golden">{formattedBalance}</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full max-w-5xl">
            <Card className="bg-gray-800 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle>Información de Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                     {loading ? (
                       <p className="text-gray-400">Cargando datos...</p>
                    ) : profile ? (
                        <ul className="space-y-2 text-sm list-none">
                            <li><strong className="text-gray-400 font-medium w-36 inline-block">Nombre:</strong> {profile.name}</li>
                            <li><strong className="text-gray-400 font-medium w-36 inline-block">Correo:</strong> {profile.email}</li>
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

        <div className="w-full max-w-5xl pt-4 mt-4 border-t border-dashed border-gray-700">
            <Button onClick={handleTestDeposit} className="w-full bg-blue-900 hover:bg-blue-800 text-white">
                Depósito de Prueba (Modo Dev)
            </Button>
            <p className="text-xs text-center text-gray-500 mt-2">
                Este botón es solo para desarrollo. Simula un depósito de 50 USDT del usuario de prueba.
            </p>
        </div>

      </div>
    </main>
  );
}
