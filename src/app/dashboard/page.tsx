'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { UserProfile, Transaction, Investment } from '@/types';
import { processInitialBonus, createWithdrawalToken, getSecondLevelReferrals, activateInvestment, claimWeeklyTicket } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Globe, Gem, Shield, Crown, Star, PiggyBank, TrendingUp, CircleDollarSign, LogOut, Gift, Home, Briefcase, Users, Link as LinkIcon, User as UserIcon, Wallet, Info, ChevronRight, AlertTriangle, Copy, Sparkles, Dices, Ticket, ListChecks } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, orderBy, limit } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AnnouncementMarquee } from '@/components/announcement-marquee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InstallPWA } from '@/components/install-pwa';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { APP_DOMAIN } from '@/lib/config';
import { UpdateNoticeModal } from '@/components/update-notice';
import { Header } from '@/components/header';
import SplashScreen from '@/components/splash-screen';

export const dynamic = 'force-dynamic';

const investmentSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser positivo.'),
});

const DepositSection = () => {
    const { toast } = useToast();
    const walletAddress = "0xe37a298c740caf1411cbccda7b250a0664a00129";

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({ title: "Dirección copiada", description: "La dirección de depósito ha sido copiada al portapapeles." });
    }

    return (
        <Card className="bg-gray-800 border-golden text-white w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <PiggyBank />
                    Depositar Fondos en Billetera
                </CardTitle>
                <CardDescription>
                    Sigue estos pasos para añadir fondos a tu Saldo de Billetera.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="text-gray-400">Paso 1: Realizar Transferencia</Label>
                    <p className="text-sm text-gray-300">
                        Transfiere la cantidad de USDT que desees (Red BEP-20) a la siguiente dirección de la empresa:
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <Input readOnly value={walletAddress} className="bg-gray-700 border-gray-600 truncate font-mono"/>
                        <Button onClick={handleCopyAddress} variant="outline" className="border-golden text-golden hover:bg-golden/10 hover:text-golden">
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar
                        </Button>
                    </div>
                </div>
                <div>
                    <Label className="text-gray-400">Paso 2: Notificar Depósito</Label>
                     <p className="text-sm text-gray-300">
                        Una vez realizada la transferencia, completa el siguiente formulario para que tu saldo sea acreditado. Necesitarás el ID o hash de la transacción.
                    </p>
                     <Button asChild className="w-full mt-4 bg-golden text-black hover:bg-amber-400">
                        <a href="https://form.jotform.com/261119201588051" target="_blank" rel="noopener noreferrer">
                            Notificar Depósito en Jotform
                        </a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

const WeeklyRewardCard = ({ user }: { user: UserProfile | null }) => {
    const { toast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [canClaim, setCanClaim] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            if (!user?.lastTicketClaim) {
                setCanClaim(true);
                setTimeLeft('');
                return;
            }

            const lastClaimDate = new Date(user.lastTicketClaim);
            const nextClaimDate = new Date(lastClaimDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
            const now = new Date();

            if (now >= nextClaimDate) {
                setCanClaim(true);
                setTimeLeft('');
            } else {
                setCanClaim(false);
                const diff = nextClaimDate.getTime() - now.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                setTimeLeft(`${days}d ${hours}h`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000 * 60 * 60); // Update every hour

        return () => clearInterval(interval);
    }, [user?.lastTicketClaim]);

    const handleClaim = async () => {
        if (!user || !canClaim || isClaiming) return;
        setIsClaiming(true);
        try {
            const result = await claimWeeklyTicket(user.uid);
            if (result.success) {
                toast({ title: '¡Éxito!', description: 'Has reclamado tu ticket semanal. ¡Vuelve en 7 días!' });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Inesperado', description: error.message });
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <Card className="bg-gray-800 border-cyan-400 text-white text-center">
            <CardHeader>
                <CardTitle className="text-xl font-medium text-gray-300 flex items-center justify-center gap-2">
                    <Ticket className="text-cyan-400"/>
                    Tu Recompensa Semanal
                </CardTitle>
            </CardHeader>
            <CardContent className="py-2 flex flex-col items-center justify-center space-y-3">
                <p className="text-sm text-gray-400">Reclama un ticket gratuito cada 7 días para jugar en el Casino.</p>
                <Button 
                    onClick={handleClaim} 
                    disabled={!canClaim || isClaiming}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-60 disabled:bg-gray-600"
                >
                    {isClaiming ? 'Reclamando...' : (canClaim ? 'Reclamar Ticket de la Suerte' : `Próximo ticket en: ${timeLeft}`)}
                </Button>
            </CardContent>
        </Card>
    )
};

const InvestmentPlansSection = ({ user }: { user: UserProfile | null }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [selectedPlan, setSelectedPlan] = useState<{name: string, min: number, max: number, dailyRate: string} | null>(null);

    const form = useForm<z.infer<typeof investmentSchema>>({
        resolver: zodResolver(investmentSchema),
        defaultValues: { amount: 0 }
    });

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);

    const handleActivateInvestment = async (data: z.infer<typeof investmentSchema>) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
            return;
        }

        if (data.amount < (selectedPlan?.min ?? 20)) {
             toast({ variant: 'destructive', title: 'Monto Inválido', description: `El monto mínimo para el plan ${selectedPlan?.name} es de ${selectedPlan?.min} USDT.` });
             return;
        }
        if (selectedPlan?.max && data.amount > selectedPlan.max) {
             toast({ variant: 'destructive', title: 'Monto Inválido', description: `El monto máximo para el plan ${selectedPlan?.name} es de ${selectedPlan?.max} USDT.` });
             return;
        }
        if (data.amount > (user.saldoUSDT ?? 0)) {
            toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: 'No tienes suficiente saldo en tu billetera para esta inversión.' });
            return;
        }

        setIsSubmitting(true);
        const result = await activateInvestment(user.uid, data.amount);
        if (result.success) {
            toast({ title: '¡Éxito!', description: result.message });
            setOpen(false);
            form.reset();
        } else {
            toast({ variant: 'destructive', title: 'Error al Invertir', description: result.error });
        }
        setIsSubmitting(false);
    };
    
    const vipPlans = [
        { name: 'Bronce VIP', investment: '$20 - $100', min: 20, max: 100, dailyRate: '2.0% Diario', icon: Shield, color: 'border-amber-400', textColor: 'text-amber-400' },
        { name: 'Plata VIP', investment: '$101 - $500', min: 101, max: 500, dailyRate: '2.4% Diario', icon: Star, color: 'border-amber-400', textColor: 'text-amber-400' },
        { name: 'Oro VIP', investment: '$501 - $1000', min: 501, max: 1000, dailyRate: '2.6% Diario', icon: Crown, color: 'border-amber-400', textColor: 'text-amber-400' },
        { name: 'Diamante VIP', investment: '$1001+', min: 1001, max: Infinity, dailyRate: '2.8% Diario', icon: Gem, color: 'border-amber-400', textColor: 'text-amber-400' },
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <div className="w-full space-y-8">
                <div>
                    <h2 className="text-3xl font-bold text-center mb-2 text-amber-400">Invertir en Planes VIP</h2>
                    <p className="text-center text-muted-foreground mb-8">Usa tu Saldo de Billetera para activar nuevos planes de inversión.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {vipPlans.map((plan) => (
                            <Card key={plan.name} className={`bg-gray-900/80 backdrop-blur-sm flex flex-col ${plan.color} border-2 shadow-lg hover:shadow-amber-400/30 transition-shadow duration-300 relative overflow-hidden`}>
                                <Badge className="absolute top-2 right-2 bg-amber-500 text-black border-amber-500">VIP BOOST</Badge>
                                <CardHeader className="items-center text-center">
                                    <plan.icon className={`w-12 h-12 mb-2 ${plan.textColor}`} />
                                    <CardTitle className={`text-xl ${plan.textColor}`}>{plan.name}</CardTitle>
                                    <CardDescription className="font-semibold text-gray-300">{plan.investment}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex items-center justify-center text-center">
                                    <p className="text-3xl font-bold text-white">{plan.dailyRate}</p>
                                </CardContent>
                                <CardFooter>
                                     <DialogTrigger asChild>
                                        <Button onClick={() => setSelectedPlan(plan)} className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
                                            Invertir USDT
                                        </Button>
                                    </DialogTrigger>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <DialogContent className="bg-gray-800 border-golden text-white">
                <DialogHeader>
                    <DialogTitle>Invertir en Plan {selectedPlan?.name}</DialogTitle>
                    <DialogDescription>
                        Introduce el monto de tu Saldo de Billetera que deseas invertir.
                        <br/>
                        Saldo disponible: <strong className="text-green-400">{formatCurrency(user?.saldoUSDT ?? 0)}</strong>
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleActivateInvestment)} className="space-y-4">
                      <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Monto a Invertir (USDT)</FormLabel>
                                  <FormControl>
                                      <Input 
                                        type="number" 
                                        placeholder={`Mínimo: ${selectedPlan?.min ?? 20}`} 
                                        {...field} 
                                        className="bg-gray-700 border-gray-600" 
                                      />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <DialogFooter>
                           <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
                              {isSubmitting ? 'Activando Inversión...' : 'Activar Inversión'}
                          </Button>
                      </DialogFooter>
                  </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const MyNetworkTab = ({ user, directReferrals, networkLoading, primaryResidualBonus, totalInvested }: { user: UserProfile | null, directReferrals: UserProfile[], networkLoading: boolean, primaryResidualBonus: number, totalInvested: number }) => {
  const { toast } = useToast();
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [level2Data, setLevel2Data] = useState<Record<string, { referrals: UserProfile[]; loading: boolean }>>({});

  const { plan2PlusCount } = useMemo(() => {
    if (networkLoading || directReferrals.length === 0) {
      return { plan2PlusCount: 0 };
    }
    const count = directReferrals.filter(ref => (ref.totalInvested ?? 0) >= 101).length;
    return { plan2PlusCount: count };
  }, [directReferrals, networkLoading]);

  const getDailyRate = (planAmount: number): number => {
    if (planAmount >= 1001) return 0.028;
    if (planAmount >= 501) return 0.026;
    if (planAmount >= 101) return 0.024;
    if (planAmount >= 20) return 0.020;
    return 0;
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  const handleToggleRow = async (referralId: string) => {
    const isCurrentlyExpanded = !!expandedRows[referralId];
    setExpandedRows(prev => ({ ...prev, [referralId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !level2Data[referralId]) {
      setLevel2Data(prev => ({ ...prev, [referralId]: { referrals: [], loading: true } }));
      try {
        const result = await getSecondLevelReferrals(referralId);
        
        if (result && result.success) {
            setLevel2Data(prev => ({
              ...prev,
              [referralId]: { referrals: result.data || [], loading: false }
            }));
        } else {
            throw new Error(result?.error || "No se pudo cargar la red de segundo nivel.");
        }
        
      } catch (error: any) {
        console.error("Error fetching L2 referrals:", error);
        toast({ variant: 'destructive', title: "Error de Red", description: error.message });
        setLevel2Data(prev => ({
          ...prev,
          [referralId]: { referrals: [], loading: false }
        }));
      }
    }
  };

  const handleClaimBonus = async (referralId: string) => {
    if (!user) return;
    setClaiming(prev => ({ ...prev, [referralId]: true }));
    try {
        const result = await processInitialBonus(referralId, user.uid);
        if (result && 'success' in result) {
            toast({
                title: "¡Éxito!",
                description: result.message,
            });
        } else if (result && 'error' in result) {
            toast({
                variant: 'destructive',
                title: "Error al reclamar",
                description: result.error,
            });
        } else {
            console.error("Unexpected result from processInitialBonus:", result);
            toast({
                variant: 'destructive',
                title: "Error Inesperado",
                description: "La respuesta del servidor no fue reconocida.",
            });
        }
    } catch (error) {
        console.error("Error calling processInitialBonus:", error);
        toast({
            variant: 'destructive',
            title: "Error de Red",
            description: "No se pudo conectar con el servidor para reclamar el bono.",
        });
    } finally {
        setClaiming(prev => ({ ...prev, [referralId]: false }));
    }
  };

  const residualBonus = 0; // Placeholder

  const levels = [
    { level: 1, required: 10, percentage: 5 },
    { level: 2, required: 15, percentage: 3 },
    { level: 3, required: 20, percentage: 2 },
    { level: 4, required: 25, percentage: 1 },
    { level: 5, required: 30, percentage: 0.5 },
  ];

  const handleCopyLink = () => {
    if (!user?.inviteCode) {
      toast({ variant: 'destructive', title: 'Sin código', description: 'No tienes un código de invitación para compartir.' });
      return;
    }
    const link = `${APP_DOMAIN}/register?ref=${user.inviteCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Enlace de invitación copiado', description: '¡Comparte tu enlace para hacer crecer tu red!' });
  };
  
  if (!user) {
    return <div className="p-4 md:p-8"><Skeleton className="h-96 w-full bg-gray-800" /></div>
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Estado de Bonos de Red</CardTitle>
            <CardDescription>Ganancias totales y saldo disponible para retiro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            {networkLoading ? <Skeleton className="h-16 w-full bg-gray-700" /> : 
            <>
                <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Ganado (Histórico):</span>
                    <p className="text-xl font-bold text-white">{formatCurrency(user?.bonoDirecto || 0)}</p>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">Disponible (Retirable):</span>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(user?.bonoRetirable || 0)}</p>
                </div>
            </>
            }
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Bono Residual</CardTitle>
            <CardDescription>Ganancias generadas por los niveles de tu red.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-cyan-400">{formatCurrency(residualBonus)}</p>
            <p className="text-xs text-muted-foreground mt-2">Esta función se encuentra en desarrollo.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle>Haz Crecer tu Red</CardTitle>
          <CardDescription>Comparte tu enlace de invitación para ganar bonos directos y residuales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label>Tu Enlace de Invitación</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={user.inviteCode ? `${APP_DOMAIN}/register?ref=${user.inviteCode}` : "Generando enlace..."} className="bg-gray-700 border-gray-600 truncate"/>
            <Button onClick={handleCopyLink} variant="outline" className="border-golden text-golden hover:bg-golden/10 hover:text-golden whitespace-nowrap">
              <LinkIcon className="mr-2 h-4 w-4" />
              Copiar Enlace
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
            <CardTitle>Mis Invitados Directos</CardTitle>
            <CardDescription>Lista de usuarios que se han registrado con tu código. Haz clic en un nombre para ver su red.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-gray-800">
                        <TableHead className="text-white">Nombre</TableHead>
                        <TableHead className="text-white">Email</TableHead>
                        <TableHead className="text-white">Inversión Total</TableHead>
                        <TableHead className="text-right text-white">Acción de Bono</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {networkLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i} className="border-gray-700">
                                <TableCell colSpan={4}><Skeleton className="h-8 w-full bg-gray-700"/></TableCell>
                            </TableRow>
                        ))
                    ) : directReferrals.length > 0 ? (
                        directReferrals.map((ref) => (
                            <Fragment key={ref.uid}>
                                <TableRow data-state={expandedRows[ref.uid] ? 'open' : 'closed'} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <TableCell className="font-medium">
                                        <button onClick={() => handleToggleRow(ref.uid)} className="flex items-center gap-2 text-left w-full">
                                            <ChevronRight className={`h-4 w-4 transition-transform ${expandedRows[ref.uid] ? 'rotate-90' : ''}`} />
                                            {ref.name}
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{ref.email}</TableCell>
                                    <TableCell>
                                        <Badge className={(ref.totalInvested ?? 0) > 0 ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}>
                                            {(ref.totalInvested ?? 0) > 0 ? formatCurrency(ref.totalInvested ?? 0) : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                    {(() => {
                                        if (ref.hasUnclaimedBonuses) {
                                            if ((totalInvested ?? 0) > 0) {
                                                return (
                                                    <Button
                                                        size="sm"
                                                        className="bg-golden hover:bg-amber-500 text-black h-8 px-3"
                                                        onClick={() => handleClaimBonus(ref.uid)}
                                                        disabled={claiming[ref.uid]}
                                                    >
                                                        {claiming[ref.uid] ? 'Cargando...' : 'Reclamar 10%'}
                                                    </Button>
                                                );
                                            } else {
                                                return (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span tabIndex={0}>
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-gray-500 text-white h-8 px-3 cursor-not-allowed"
                                                                        disabled
                                                                    >
                                                                        ⚠️ Activa un plan
                                                                    </Button>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Necesitas una inversión activa para cobrar comisiones de red.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            }
                                        }
                                        if ((ref.totalInvested ?? 0) > 0) {
                                             return <Badge variant="outline" className="text-muted-foreground border-gray-600">Sin bonos nuevos</Badge>;
                                        }
                                        return <span className="text-xs text-gray-500">Sin plan</span>;
                                    })()}
                                </TableCell>
                                </TableRow>
                                {expandedRows[ref.uid] && (
                                    <TableRow className="bg-black/20">
                                        <TableCell colSpan={4} className="p-0">
                                            <div className="p-4 mx-4 my-2 bg-gray-900/50 rounded-lg">
                                                <h4 className="text-sm font-semibold mb-2 text-gray-300">Red de {ref.name} (Nivel 2)</h4>
                                                {level2Data[ref.uid]?.loading ? (
                                                    <Skeleton className="h-10 w-full bg-gray-700/50" />
                                                ) : level2Data[ref.uid]?.referrals.length > 0 ? (
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="border-gray-700 hover:bg-gray-800/50">
                                                                <TableHead className="text-white/70">Nombre</TableHead>
                                                                <TableHead className="text-white/70">Email</TableHead>
                                                                <TableHead className="text-right text-white/70">Inversión Total</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {level2Data[ref.uid].referrals.map(l2ref => (
                                                                <TableRow key={l2ref.uid} className="border-gray-800 hover:bg-gray-800/50">
                                                                    <TableCell className="font-medium text-sm">{l2ref.name}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-sm">{l2ref.email}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant="outline" className={(l2ref.totalInvested ?? 0) > 0 ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-400'}>
                                                                            {(l2ref.totalInvested ?? 0) > 0 ? formatCurrency(l2ref.totalInvested ?? 0) : 'Inactivo'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">Este usuario aún no tiene invitados.</p>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                Aún no tienes invitados directos. ¡Comparte tu enlace!
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
            <CardTitle>Bono Residual Primario</CardTitle>
            <CardDescription>Comisión sobre las ganancias diarias de tus invitados directos.</CardDescription>
        </CardHeader>
        <CardContent>
            {networkLoading ? (
                <Skeleton className="h-16 w-full bg-gray-700" />
            ) : user && (totalInvested ?? 0) >= 101 && plan2PlusCount >= 10 ? (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-4xl font-bold text-cyan-400">{formatCurrency(primaryResidualBonus)}</span>
                        <Badge className="bg-green-600 text-white">ACTIVO</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Este es el total acumulado del 5% de la ganancia diaria de tus directos con inversiones activas.</p>
                </div>
            ) : (
                <div className="text-center p-4 rounded-lg bg-gray-900/50">
                     <p className="text-muted-foreground">Invierte $101 o más y ten 10 invitados directos con Plan Plata o superior para activar.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle>Niveles de Bono Residual</CardTitle>
          <CardDescription>Desbloquea niveles invitando a nuevos miembros con un Plan Plata o superior (≥ $101).</CardDescription>
        </CardHeader>
        <CardContent>
           {networkLoading ? <Skeleton className="h-4 w-32 bg-gray-700 mb-4"/> : <p className="mb-4 text-sm">Directos con Plan Plata o superior: <span className="font-bold text-golden">{plan2PlusCount}</span></p>}
           <Table>
              <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-800">
                      <TableHead className="text-white">Nivel</TableHead>
                      <TableHead className="text-white">Requisito (Directos Plan 2+)</TableHead>
                      <TableHead className="text-white">Comisión</TableHead>
                      <TableHead className="text-right text-white">Estado</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {networkLoading ? Array.from({length: 5}).map((_, i) => (
                      <TableRow key={i} className="border-gray-700"><TableCell colSpan={4}><Skeleton className="h-8 w-full bg-gray-700"/></TableCell></TableRow>
                  )) : levels.map((levelInfo) => {
                      const isActive = plan2PlusCount >= levelInfo.required;
                      return (
                          <TableRow key={levelInfo.level} className="border-gray-700 hover:bg-gray-700/50">
                              <TableCell className="font-medium">{levelInfo.level}</TableCell>
                              <TableCell>{levelInfo.required}</TableCell>
                              <TableCell>{levelInfo.percentage}%</TableCell>
                              <TableCell className="text-right">
                                  <Badge className={isActive ? 'bg-green-600 text-white' : 'bg-red-800 text-white'}>
                                      {isActive ? 'Activo' : 'Bloqueado'}
                                  </Badge>
                              </TableCell>
                          </TableRow>
                      );
                  })}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="text-center text-xs text-muted-foreground pt-4">
          <p>Nota: La funcionalidad de red y bonos depende de que el campo 'invitadoPor' sea correctamente asignado durante el registro.</p>
      </div>
    </div>
  );
};

const TransactionHistory = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<(Transaction & {id: string})[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        return;
    }
    
    const transactionsQuery = query(collection(db, 'users', userId, 'transacciones'), orderBy('fecha', 'desc'), limit(5));

    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
        const txs = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                data.fecha = data.fecha.toDate().toISOString();
            }
            return { id: doc.id, ...data } as Transaction & {id: string};
        });
        setTransactions(txs);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching transactions:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);


  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  const formatDate = (isoString: string) => {
    try {
        return new Date(isoString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return "Fecha inválida";
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-gray-800">
              <TableHead className="text-white">Fecha</TableHead>
              <TableHead className="text-white">Descripción</TableHead>
              <TableHead className="text-right text-white">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-gray-700">
                  <TableCell colSpan={3}><Skeleton className="h-8 w-full bg-gray-700"/></TableCell>
                </TableRow>
              ))
            ) : transactions && transactions.length > 0 ? (
              transactions.map((tx) => (
                <TableRow key={tx.id} className="border-gray-700 hover:bg-gray-700/50">
                  <TableCell className="text-muted-foreground text-xs">{formatDate(tx.fecha)}</TableCell>
                  <TableCell className="font-medium">{tx.descripcion}</TableCell>
                  <TableCell className={`text-right font-semibold ${tx.monto > 0 ? 'text-green-400' : tx.monto < 0 ? 'text-red-400' : 'text-white'}`}>
                    {tx.monto > 0 ? '+ ' : ''}{formatCurrency(tx.monto)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                  Aún no tienes movimientos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const withdrawalFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Por favor, introduce un monto válido.' }),
});

const WithdrawalSection = ({ user, mainBalance, referralBalance }: { user: UserProfile, mainBalance: number, referralBalance: number }) => {
  const { toast } = useToast();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState<'referral' | 'main'>('referral');
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  useEffect(() => {
    const checkDate = () => {
        try {
            const londonTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
            const day = londonTime.getDate();
            const isSpecialDay = [10, 20, 30].includes(day);

            if (withdrawalType === 'main') {
                setIsWindowOpen(isSpecialDay);
            } else { // For referral bonus
                setIsWindowOpen(!isSpecialDay);
            }
        } catch (e) {
            console.error("Could not determine London time for withdrawal rules.", e);
            setIsWindowOpen(false); // Fail-safe
        }
    };

    checkDate();
    const interval = setInterval(checkDate, 60000); 

    return () => clearInterval(interval);
  }, [withdrawalType]);
  
  const form = useForm<z.infer<typeof withdrawalFormSchema>>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const amount = form.watch('amount');
  const maxAmount = useMemo(() => {
    return withdrawalType === 'referral' ? referralBalance : mainBalance;
  }, [withdrawalType, referralBalance, mainBalance]);

  const isAmountInvalid = amount <= 0 || amount > maxAmount;
  const isButtonDisabled = isSubmitting || isAmountInvalid || !isWindowOpen;

  const getButtonText = () => {
    if (isSubmitting) return 'Generando...';
    if (!isWindowOpen) {
        if (withdrawalType === 'main') {
            return 'Retiro de Ganancias no disponible hoy';
        } else {
            return 'Retiro de Bono no disponible hoy';
        }
    }
    return 'Generar Token';
  };
  
  const alertDescription = useMemo(() => {
    if (withdrawalType === 'main') {
        return 'Retiros de Ganancias de Inversión disponibles solo los días 10, 20 y 30 de cada mes (00:00 a 23:59, hora de Londres).';
    }
    return 'Retiros de Bono Referido disponibles cualquier día EXCEPTO los días 10, 20 y 30.';
  }, [withdrawalType]);


  const handleGenerateToken = async (values: z.infer<typeof withdrawalFormSchema>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para realizar esta acción.' });
      return;
    }

    setIsSubmitting(true);
    setGeneratedToken(null);

    const result = await createWithdrawalToken({
      amount: values.amount,
      user: {
        uid: user.uid,
        email: user.email,
        saldoUSDT: user.saldoUSDT,
        bonoRetirable: user.bonoRetirable,
        retirosTotales: user.retirosTotales ?? 0,
      },
      withdrawalType: withdrawalType,
    });

    if (result.success) {
      setGeneratedToken(result.token);
      toast({ title: '¡Éxito!', description: 'Tu token de retiro ha sido generado.' });
      form.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      toast({ title: 'Copiado', description: 'Token copiado al portapapeles.' });
    }
  };

  return (
    <Card className="bg-gray-800 border-golden text-white w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Wallet />
          Solicitar Retiro
        </CardTitle>
        <CardDescription>
          Genera un token para autorizar tu solicitud de retiro de fondos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-4">
          <div className="lg:col-span-3 space-y-6">

            <RadioGroup defaultValue="referral" onValueChange={(value) => setWithdrawalType(value as 'referral' | 'main')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                  <RadioGroupItem value="referral" id="r1" />
                  <Label htmlFor="r1">Bono Referido</Label>
              </div>
              <div className="flex items-center space-x-2">
                  <RadioGroupItem value="main" id="r2" />
                  <Label htmlFor="r2">Ganancias de Inversión</Label>
              </div>
            </RadioGroup>

            <Alert variant="default" className="bg-amber-900/30 border-amber-700/50 text-amber-200 [&>svg]:text-amber-400">
              <Info className="h-4 w-4" />
              <AlertTitle>Aviso de Retiro</AlertTitle>
              <AlertDescription>
                {alertDescription}
              </AlertDescription>
            </Alert>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleGenerateToken)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto a Retirar (USDT)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej: 100" {...field} className="bg-gray-700 border-gray-600" />
                      </FormControl>
                       <FormDescription className="text-xs">
                         Disponible: {maxAmount.toFixed(2)} USDT
                       </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white disabled:bg-gray-600 disabled:opacity-50" disabled={isButtonDisabled}>
                  {getButtonText()}
                </Button>
              </form>
            </Form>

            {generatedToken && (
              <div className="mt-6 p-4 border border-golden rounded-lg bg-gray-900/50 text-center">
                <p className="text-sm text-gray-400 mb-2">Tu token de retiro es:</p>
                <p className="text-2xl font-mono font-bold text-golden break-all">{generatedToken}</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                  <Button onClick={handleCopyToken} variant="outline" className="w-full border-gray-500 text-gray-300 hover:bg-gray-700">
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Token
                  </Button>
                  <Button asChild className="w-full bg-golden text-black hover:bg-amber-400">
                    <a href="https://form.jotform.com/260687723494065" target="_blank" rel="noopener noreferrer">
                      Completar Retiro en Jotform
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 space-y-4 rounded-lg bg-gray-900/40 p-4 border border-gray-700">
              <h3 className="text-lg font-bold flex items-center gap-2"><Info /> Pasos para Retirar</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
                  <li>
                      <strong>Genera tu Token:</strong> Introduce el monto a retirar y haz clic en 'Generar Token'.
                  </li>
                  <li>
                      <strong>Copia el Token:</strong> Una vez que aparezca, usa el botón 'Copiar Token'.
                  </li>
                  <li>
                      <strong>Completa en Jotform:</strong> Haz clic en el botón para ir al formulario seguro y pega tu token para finalizar.
                  </li>
              </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const getDailyRate = (planAmount: number): number => {
    if (planAmount >= 1001) return 0.028;
    if (planAmount >= 501) return 0.026;
    if (planAmount >= 101) return 0.024;
    if (planAmount >= 20) return 0.020;
    return 0;
};

export default function DashboardPage() {
  const { user: profile, firebaseUser, loading: authLoading } = useAuth();
  const { t, setLocale } = useTranslation();
  const router = useRouter();
  
  const [directReferrals, setDirectReferrals] = useState<UserProfile[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [networkLoading, setNetworkLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.replace('/login');
    }
  }, [authLoading, firebaseUser, router]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  useEffect(() => {
    if (!profile?.uid) {
      setNetworkLoading(false);
      setDirectReferrals([]);
      return;
    }
    
    setNetworkLoading(true);
    const referralsQuery = query(collection(db, 'users'), where('invitadoPor', '==', profile.uid));
    const unsubscribe = onSnapshot(referralsQuery, (snapshot) => {
      const refs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setDirectReferrals(refs);
      setNetworkLoading(false);
    }, (error) => {
      console.error("Error fetching referrals:", error);
      setNetworkLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid) {
        setInvestments([]);
        return;
    };
    const investmentsQuery = query(collection(db, 'users', profile.uid, 'investments'));
    const unsubscribe = onSnapshot(investmentsQuery, (snapshot) => {
        const invs = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamps to ISO strings to prevent date calculation errors.
            if (data.startDate && typeof data.startDate.toDate === 'function') {
                data.startDate = data.startDate.toDate().toISOString();
            }
            if (data.lastUpdated && typeof data.lastUpdated.toDate === 'function') {
                data.lastUpdated = data.lastUpdated.toDate().toISOString();
            }
            return { id: doc.id, ...data } as Investment;
        });
        setInvestments(invs);
    });
    return () => unsubscribe();
  }, [profile?.uid]);
  
  const { displayWalletBalance, referralBalance, totalLifetimeEarnings, primaryResidualBonus, totalInvested, totalEarningsCap } = useMemo(() => {
    const defaultValues = { displayWalletBalance: 0, referralBalance: 0, totalLifetimeEarnings: 0, primaryResidualBonus: 0, totalInvested: 0, totalEarningsCap: 0 };
    
    if (!profile || authLoading) {
      return defaultValues;
    }

    const now = new Date();
    let unconsolidatedEarnings = 0;
    let totalDbGeneratedEarnings = 0;


    if (investments) {
        investments.forEach(inv => {
            const dbGenerated = inv.earningsGenerated ?? 0;
            totalDbGeneratedEarnings += dbGenerated;

            if (inv.status === 'active') {
                const startDate = new Date(inv.startDate);
                if (isNaN(startDate.getTime())) return; // Skip if date is invalid

                const diffTime = now.getTime() - startDate.getTime();
                let totalExpectedEarningForPlan = 0;
                
                // If dailyRate is not stored, calculate it on the fly.
                const rate = inv.dailyRate ?? getDailyRate(inv.amount);

                if (diffTime > 0 && rate > 0) {
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    totalExpectedEarningForPlan = inv.amount * rate * diffDays;
                }
                
                const maxEarningForPlan = inv.amount * 3;
                if (totalExpectedEarningForPlan > maxEarningForPlan) {
                    totalExpectedEarningForPlan = maxEarningForPlan;
                }

                const planUnconsolidated = totalExpectedEarningForPlan - dbGenerated;
                if (planUnconsolidated > 0) {
                    unconsolidatedEarnings += planUnconsolidated;
                }
            }
        });
    }

    const lifetimeForDisplay = totalDbGeneratedEarnings + unconsolidatedEarnings;
    
    const walletForDisplay = (profile.saldoUSDT ?? 0) + unconsolidatedEarnings;

    return { 
        displayWalletBalance: walletForDisplay,
        referralBalance: profile.bonoRetirable ?? 0,
        totalLifetimeEarnings: lifetimeForDisplay,
        primaryResidualBonus: 0, // Not implemented
        totalInvested: profile.totalInvested ?? 0,
        totalEarningsCap: (profile.totalInvested ?? 0) * 3,
    };
  }, [profile, authLoading, investments]);


  const statItems = useMemo(() => {
    if (!profile) {
      return [
        { title: t('dashboard.totalInvestment'), value: 0, icon: PiggyBank },
        { title: t('dashboard.generatedEarnings'), value: 0, icon: TrendingUp },
        { title: t('dashboard.totalWithdrawals'), value: 0, icon: CircleDollarSign },
      ];
    }
    return [
      { title: t('dashboard.totalInvestment'), value: totalInvested, icon: PiggyBank },
      { title: t('dashboard.generatedEarnings'), value: totalLifetimeEarnings, icon: TrendingUp },
      { title: t('dashboard.totalWithdrawals'), value: profile.retirosTotales ?? 0, icon: CircleDollarSign },
    ];
  }, [t, profile, totalInvested, totalLifetimeEarnings]);

  const [chartData, setChartData] = useState<any[]>([]);
  const statsLoading = authLoading;

  useEffect(() => {
    if (authLoading || !profile) {
      setChartData([]);
      return;
    }

    const points = 7;
    const data = [];
    const earnings = displayWalletBalance;
    for (let i = 0; i < points; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (points - 1 - i));
        const balance = (earnings / points) * (i + 1);
        data.push({
            date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
            balance: parseFloat(balance.toFixed(2)),
        });
    }
    
    if (data.length > 0) {
        data[data.length - 1].balance = earnings;
        data[data.length - 1].date = 'Ahora';
    } else if (earnings > 0) {
        data.push({ date: 'Ahora', balance: earnings });
    }

    setChartData(data);
  }, [displayWalletBalance, authLoading, profile]);
  
  const BuyTicketsComponent = () => {
    const { toast } = useToast();
    const ticketWalletAddress = "0x471d4424e1016a256a8d13283522302cb020a4d2";
    const binanceId = "797960108";

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(ticketWalletAddress);
        toast({ title: "Dirección copiada", description: "La dirección de billetera ha sido copiada al portapapeles." });
    };

    const handleCopyBinanceId = () => {
        navigator.clipboard.writeText(binanceId);
        toast({ title: "ID de Binance copiado", description: "El ID de Binance ha sido copiado al portapapeles." });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-golden text-golden hover:bg-golden/10">
                    🎟️ Comprar Tickets de la Suerte
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-golden text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Ticket className="text-golden"/> Comprar Tickets de la Suerte</DialogTitle>
                    <DialogDescription>
                        Elige un paquete para continuar la diversión.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                        <span className="font-semibold">1 Ticket</span>
                        <span className="text-golden font-bold text-lg">$0.99</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 border-2 border-golden shadow-lg">
                        <span className="font-semibold">5 Tickets</span>
                        <span className="text-golden font-bold text-lg">$4.99</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                        <span className="font-semibold">10 Tickets</span>
                        <span className="text-golden font-bold text-lg">$9.99</span>
                    </div>
                </div>
                <div className="px-6 pb-4 space-y-4">
                    <div>
                        <Label className="text-xs text-muted-foreground">BILLETERA BEP20 PARA COMPRA DE TICKET:</Label>
                        <div className="flex items-center gap-2">
                            <Input readOnly value={ticketWalletAddress} className="bg-gray-700 border-gray-600 truncate font-mono text-sm"/>
                            <Button onClick={handleCopyAddress} variant="outline" size="icon" className="border-golden text-golden hover:bg-golden/10 hover:text-golden flex-shrink-0">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">ID BINANCE "Sunshine UK":</Label>
                        <div className="flex items-center gap-2">
                            <Input readOnly value={binanceId} className="bg-gray-700 border-gray-600 truncate font-mono text-sm"/>
                            <Button onClick={handleCopyBinanceId} variant="outline" size="icon" className="border-golden text-golden hover:bg-golden/10 hover:text-golden flex-shrink-0">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button asChild className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
                        <a href="https://form.jotform.com/261119201588051" target="_blank" rel="noopener noreferrer">
                            Solicitar Tickets
                        </a>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
  };


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };
  
  if (authLoading || !firebaseUser) {
    return <SplashScreen />;
  }

  const userName = profile?.name || t('dashboard.investor');
  const progress = totalEarningsCap > 0 ? (totalLifetimeEarnings / totalEarningsCap) * 100 : 0;
  
  const chartConfig = {
    balance: {
      label: 'Saldo',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;


  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">
        <main className="bg-gray-900 text-white min-h-screen font-body relative pb-24">
          <UpdateNoticeModal />
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
            <AnnouncementMarquee />
          </header>

          <Tabs defaultValue="inicio" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-gray-800/50 rounded-none sticky top-16 z-40 backdrop-blur-sm">
              <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" /> Inicio</TabsTrigger>
              <TabsTrigger value="profile" asLink href="/profile"><UserIcon className="mr-2 h-4 w-4" />{t('profile.title')}</TabsTrigger>
              <TabsTrigger value="mi-red"><Users className="mr-2 h-4 w-4" /> Mi Red</TabsTrigger>
              <TabsTrigger value="asistente" asLink href="/asistente"><Sparkles className="mr-2 h-4 w-4" /> Asistente</TabsTrigger>
              <TabsTrigger value="casino" asLink href="/casino"><Dices className="mr-2 h-4 w-4" /> Casino</TabsTrigger>
            </TabsList>
            <TabsContent value="inicio">
              <div className="p-4 md:p-8">
                <div className="flex flex-col items-center justify-start w-full h-full pt-8 space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">{t('dashboard.greeting', { name: userName })}</h1>
                    </div>

                    <div className="text-center -my-4">
                      <p className="text-xs text-golden/70 tracking-[0.2em] uppercase">
                        ATENCIÓN AL CLIENTE: LUNES A VIERNES 10 AM - 12 AM | SÁBADO Y DOMINGO 12 PM - 12 AM
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                        <Card className="bg-gray-800 border-green-400 text-white text-center">
                            <CardHeader>
                            <CardTitle className="text-xl font-medium text-gray-300">
                                Saldo de Billetera (para Invertir)
                            </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2">
                            {authLoading ? (
                                <Skeleton className="h-12 w-1/2 mx-auto bg-gray-700" />
                            ) : (
                                <p className="text-5xl font-bold text-green-400">{formatCurrency(displayWalletBalance)}</p>
                            )}
                            </CardContent>
                        </Card>
                        <Card className="bg-gray-800 border-cyan-400 text-white text-center">
                            <CardHeader>
                            <CardTitle className="text-xl font-medium text-gray-300">
                                Bono Referido (Retirable)
                            </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2">
                            {authLoading ? (
                                <Skeleton className="h-12 w-1/2 mx-auto bg-gray-700" />
                            ) : (
                                <p className="text-5xl font-bold text-cyan-400">{formatCurrency(referralBalance)}</p>
                            )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="w-full max-w-5xl">
                        <WeeklyRewardCard user={profile} />
                    </div>

                    <div className="w-full max-w-5xl">
                        <Card className="bg-gray-800 border-gray-700 text-white text-center">
                            <CardHeader>
                                <CardTitle className="text-xl font-medium text-gray-300 flex items-center justify-center gap-2">
                                    <Ticket className="text-golden"/>
                                    Más Oportunidades
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-400 mb-4">¿Se te acabaron los tickets? ¡No te preocupes! Compra más para seguir la diversión.</p>
                                <BuyTicketsComponent />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="w-full max-w-5xl">
                        <DepositSection />
                    </div>

                    <div className="w-full max-w-5xl">
                        <InvestmentPlansSection user={profile} />
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
                        <Card className="bg-gray-800 border-gray-700 text-white">
                            <CardHeader>
                                <CardTitle>Estado de Inversión Global</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {authLoading ? (
                                   <Skeleton className="h-20 w-full bg-gray-700" />
                                ) : totalInvested > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-lg">Inversión Total Activa: <span className="font-bold text-golden">{formatCurrency(totalInvested)} USDT</span></p>
                                        <p className="text-lg">Ganancias Totales Acumuladas: <span className="font-bold text-green-400">{formatCurrency(totalLifetimeEarnings)}</span> / <span className="text-sm text-gray-400" title="Límite de Retorno (300%)">{formatCurrency(totalEarningsCap)}</span></p>
                                    </div>
                                ) : (
                                    <p>No tienes un plan activo. Realiza un depósito y activa una inversión para obtener uno.</p>
                                )}
                            </CardContent>
                            {totalInvested > 0 && (
                                <CardFooter className="pt-4 flex-col items-start gap-4">
                                    <div className="w-full space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Progreso de Retorno (Límite 300%)</span>
                                            <span>{progress.toFixed(0)}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2 [&>div]:bg-golden" />
                                    </div>
                                </CardFooter>
                            )}
                        </Card>
                    </div>

                    {profile && !authLoading && (
                      <div className="w-full max-w-5xl">
                        <WithdrawalSection user={profile} mainBalance={displayWalletBalance} referralBalance={referralBalance} />
                      </div>
                    )}
                    
                    {profile && !authLoading && (
                      <div className="w-full max-w-5xl">
                          <TransactionHistory userId={profile.uid} />
                      </div>
                    )}

                    <div className="w-full max-w-5xl">
                        <Card className="bg-gray-800/80 border-gray-700 p-6 space-y-4">
                            <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">⚠️</span>
                                <p className="text-sm text-gray-300">
                                    <strong className="font-semibold text-white">Aviso de Seguridad:</strong> Las cuentas nuevas que no registren ninguna inversión durante sus primeros 10 días serán eliminadas automáticamente del sistema para optimizar recursos.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">🛠️</span>
                                <p className="text-sm text-gray-300">
                                    <strong className="font-semibold text-white">Soporte Técnico:</strong> Si detecta alguna falla, bug o anomalía en su saldo, por favor contacte a soporte técnico de inmediato para su corrección.
                                </p>
                            </div>
                        </Card>
                    </div>

                  </div>
                </div>
            </TabsContent>
            <TabsContent value="mi-red">
              <MyNetworkTab user={profile} directReferrals={directReferrals} networkLoading={networkLoading} primaryResidualBonus={primaryResidualBonus} totalInvested={totalInvested}/>
            </TabsContent>
          </Tabs>
          <InstallPWA />
        </main>
      </div>
    </div>
  );
}
