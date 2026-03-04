'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SplashScreen from '@/components/splash-screen';
import type { UserProfile } from '@/types';

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
import { getWalletAddress, submitDeposit, logoutUser } from '@/lib/actions';
import { Copy, Upload, LogOut, PiggyBank, TrendingUp, CircleDollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';


const depositFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0.' }),
  proof: z
    .any()
    .refine((files) => files?.length == 1, 'Debes subir un comprobante.')
    .refine((files) => files?.[0]?.size <= 5000000, `El tamaño máximo del archivo es 5MB.`)
    .refine(
      (files) => ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type),
      'Solo se permiten archivos .jpg, .png y .webp.'
    ),
});


const DepositCard = ({ user }: { user: UserProfile | null }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getWalletAddress().then(setWalletAddress);
  }, []);

  const form = useForm<z.infer<typeof depositFormSchema>>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: undefined,
      proof: undefined,
    },
  });

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast({ title: t('dashboard.copy'), description: 'Dirección de billetera copiada al portapapeles.' });
  };

  async function onSubmit(values: z.infer<typeof depositFormSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para depositar.' });
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('amount', values.amount.toString());
    formData.append('proof', values.proof[0]);
    formData.append('userId', user.uid);
    formData.append('userName', user.name);

    try {
        const result = await submitDeposit(formData);

        if (result?.error) {
          toast({ variant: 'destructive', title: 'Error al depositar', description: result.error });
        } else {
          toast({ title: '¡Comprobante enviado!', description: 'Tu solicitud de depósito está siendo revisada.' });
          form.reset();
        }
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error inesperado', description: error.message || 'Ocurrió un problema al enviar el formulario.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="bg-gray-800 border-golden text-white w-full">
      <CardHeader>
        <CardTitle>{t('dashboard.depositTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="wallet-address">{t('dashboard.usdtAddress')}</Label>
          <div className="flex items-center gap-2">
            <Input id="wallet-address" readOnly value={walletAddress} className="bg-gray-700 border-gray-600 truncate" placeholder="Cargando dirección..."/>
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
                    <Input type="number" placeholder="100.00" {...field} className="bg-gray-700 border-gray-600" />
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
                                <span className="truncate">{form.watch('proof')?.[0]?.name || 'Seleccionar archivo'}</span>
                            </label>
                        </Button>
                        <Input 
                            id="proof-upload"
                            type="file" 
                            className="hidden" 
                            accept="image/*"
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
              {isSubmitting ? 'Enviando...' : t('dashboard.sendProof')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};


export default function TestPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [stats, setStats] = useState({ totalInvested: 0, earnings: 0, withdrawals: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  
  const balance = user?.saldoUSDT ?? 0;

  const chartData = useMemo(() => [
    { date: 'Hace 6d', balance: balance > 120 ? balance - 120 : 880 },
    { date: 'Hace 5d', balance: balance > 100 ? balance - 100 : 900 },
    { date: 'Hace 4d', balance: balance > 80 ? balance - 80 : 920 },
    { date: 'Hace 3d', balance: balance > 60 ? balance - 60 : 940 },
    { date: 'Hace 2d', balance: balance > 30 ? balance - 30 : 970 },
    { date: 'Ayer', balance: balance > 10 ? balance - 10 : 990 },
    { date: 'Hoy', balance: balance },
  ], [balance]);

   useEffect(() => {
    if (user?.uid) {
      const fetchStats = async () => {
        setStatsLoading(true);
        try {
          const depositsQuery = query(
            collection(db, 'deposit_requests'),
            where('userId', '==', user.uid),
            where('status', '==', 'Aprobado')
          );
          const querySnapshot = await getDocs(depositsQuery);
          const totalInvested = querySnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

          setStats({
            totalInvested,
            earnings: 0, // Placeholder
            withdrawals: 0, // Placeholder
          });
        } catch (error) {
          console.error("Error fetching stats:", error);
        } finally {
          setStatsLoading(false);
        }
      };

      fetchStats();
    } else if (!loading) {
        setStatsLoading(false);
    }
  }, [user?.uid, loading]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  if (loading) {
    return <SplashScreen />;
  }

  const userName = user?.name || 'Inversor';

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  const formattedBalance = formatCurrency(balance);
  
  const statItems = [
    { title: 'Inversión Total', value: stats.totalInvested, icon: PiggyBank },
    { title: 'Ganancias Generadas', value: stats.earnings, icon: TrendingUp },
    { title: 'Retiros Totales', value: stats.withdrawals, icon: CircleDollarSign },
  ];

  const chartConfig = {
    balance: {
      label: 'Saldo',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;


  return (
    <main className="bg-gray-900 text-white min-h-screen font-body p-4 md:p-8 relative">
       <div className="absolute top-4 right-4 md:top-8 md:right-8">
         <Button onClick={handleLogout} variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700">
            <LogOut className="mr-2 h-4 w-4" />
            {t('profile.logout')}
        </Button>
      </div>

      <div className="flex flex-col items-center justify-start w-full h-full pt-16 sm:pt-8 space-y-8">
        <div className="text-center">
            <h1 className="text-3xl font-bold">Hola, {userName}!</h1>
        </div>
        
        <div className="w-full max-w-3xl">
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

        <div className="w-full max-w-3xl">
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
        
        <div className="w-full max-w-3xl">
            <Card className="bg-gray-800 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle>Crecimiento de Saldo (Últimos 7 Días)</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
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
                                    formatter={(value, name) => [formatCurrency(value as number), 'Saldo']}
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
                </CardContent>
            </Card>
        </div>


        <div className="w-full max-w-3xl">
          <DepositCard user={user} />
        </div>
      </div>
    </main>
  );
}
