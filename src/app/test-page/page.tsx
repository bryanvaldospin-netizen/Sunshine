'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { UserProfile, Transaction } from '@/types';
import { processInitialBonus, createWithdrawalToken, claimAndFinalizeCycle, getSecondLevelReferrals, syncInviteCodes } from '@/lib/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Globe, Gem, Shield, Crown, Zap, Star, PiggyBank, TrendingUp, CircleDollarSign, LogOut, Gift, Home, Briefcase, Users, Link as LinkIcon, User as UserIcon, Wallet, Info, ChevronRight, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit, getDocs } from 'firebase/firestore';
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
import { Copy } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InstallPWA } from '@/components/install-pwa';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { APP_DOMAIN } from '@/lib/config';


const InvestmentPlansSection = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<{name: string, investment: string, dailyRate: string} | null>(null);
    const walletAddress = '0xe37a298c740caf1411cbccda7b250a0664a00129';

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({ title: t('dashboard.copy'), description: t('dashboard.copied') });
    };

    const plans = [
        { name: 'Bronce', investment: '$20 - $100', dailyRate: '1.5% Diario', icon: Shield, color: 'border-bronze', textColor: 'text-bronze' },
        { name: 'Plata', investment: '$101 - $500', dailyRate: '1.8% Diario', icon: Star, color: 'border-silver', textColor: 'text-silver' },
        { name: 'Oro', investment: '$501 - $1000', dailyRate: '2.0% Diario', icon: Crown, color: 'border-golden', textColor: 'text-golden' },
        { name: 'Diamante', investment: '$1001+', dailyRate: '2.5% Diario', icon: Gem, color: 'border-diamond', textColor: 'text-diamond' },
    ];
    
    const vipPlans = [
        { name: 'Bronce VIP', investment: '$20 - $100', dailyRate: '2.0% Diario', icon: Shield, color: 'border-amber-400', textColor: 'text-amber-400' },
        { name: 'Plata VIP', investment: '$101 - $500', dailyRate: '2.4% Diario', icon: Star, color: 'border-amber-400', textColor: 'text-amber-400' },
        { name: 'Oro VIP', investment: '$501 - $1000', dailyRate: '2.6% Diario', icon: Crown, color: 'border-amber-400', textColor: 'text-amber-400' },
        { name: 'Diamante VIP', investment: '$1001+', dailyRate: '2.8% Diario', icon: Gem, color: 'border-amber-400', textColor: 'text-amber-400' },
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <div className="p-4 md:p-8 space-y-12">
                <div>
                    <h2 className="text-3xl font-bold text-center mb-2 text-gray-300">Planes Estándar</h2>
                    <p className="text-center text-muted-foreground mb-8">Rendimientos consistentes para iniciar tu camino.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {plans.map((plan) => (
                            <Card key={plan.name} className={`bg-gray-800/80 backdrop-blur-sm flex flex-col ${plan.color} border-2 shadow-lg hover:shadow-golden/20 transition-shadow duration-300`}>
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
                                            Depositar USDT
                                        </Button>
                                    </DialogTrigger>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-3xl font-bold text-center mb-2 text-amber-400">Planes VIP Boost</h2>
                    <p className="text-center text-muted-foreground mb-8">Maximiza tus ganancias con nuestras tasas preferenciales.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {vipPlans.map((plan) => (
                            <Card key={plan.name} className={`bg-gray-900/80 backdrop-blur-sm flex flex-col ${plan.color} border-2 shadow-lg hover:shadow-amber-400/30 transition-shadow duration-300 relative overflow-hidden`}>
                                <Badge className="absolute top-2 right-2 bg-amber-500 text-black border-amber-500">VIP Boost</Badge>
                                <CardHeader className="items-center text-center">
                                    <plan.icon className={`w-12 h-12 mb-2 ${plan.textColor}`} />
                                    <CardTitle className={`text-xl ${plan.textColor}`}>{plan.name}</CardTitle>
                                    <CardDescription className="font-semibold text-gray-300">{plan.investment}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow flex items-center justify-center text-center">
                                    <p className="text-3xl font-bold text-white">{plan.dailyRate}</p>
                                </CardContent>
                                <CardFooter className="flex-col items-center">
                                    <DialogTrigger asChild>
                                        <Button onClick={() => setSelectedPlan(plan)} className="w-full bg-gradient-to-r from-amber-500 to-amber-700 text-white">
                                            Depositar USDT
                                        </Button>
                                    </DialogTrigger>
                                    <p className="text-xs text-muted-foreground mt-3 text-center">
                                        +$3 USDT de activación incluido en el monto final.
                                    </p>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <DialogContent className="bg-gray-800 border-golden text-white">
                <DialogHeader>
                    <DialogTitle>Realizar Depósito para Plan {selectedPlan?.name}</DialogTitle>
                    <DialogDescription>
                        Transfiere el monto a la billetera USDT (BEP-20) y luego haz clic para completar tu solicitud.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Label htmlFor="wallet-address">Billetera de Depósito (USDT - BEP-20)</Label>
                    <div className="flex items-center gap-2">
                        <Input id="wallet-address" readOnly value={walletAddress} className="bg-gray-700 border-gray-600 truncate text-sm"/>
                        <Button variant="outline" size="icon" onClick={handleCopy} className="border-golden text-golden hover:bg-golden/10 hover:text-golden flex-shrink-0">
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                     <Button asChild className="w-full bg-gradient-to-r from-golden to-red-800 text-white text-lg py-6">
                      <a href="https://form.jotform.com/260646464495063" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                        Solicitar Inversión
                      </a>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const DailyBonusCard = ({ user }: { user: UserProfile }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isClaimable, setIsClaimable] = useState(false);

    useEffect(() => {
        const canClaim = () => {
            if (!user.ultimoCheckIn) return true;
            const lastCheckInDate = new Date(user.ultimoCheckIn);
            const today = new Date();
            // Compare dates, ignoring time
            return lastCheckInDate.toDateString() !== today.toDateString();
        };
        setIsClaimable(canClaim());
    }, [user.ultimoCheckIn]);

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
            setIsClaimable(false); // Update state after successful claim

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

const MyNetworkTab = ({ user, directReferrals, networkLoading, primaryResidualBonus }: { user: UserProfile | null, directReferrals: UserProfile[], networkLoading: boolean, primaryResidualBonus: number }) => {
  const { toast } = useToast();
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [level2Data, setLevel2Data] = useState<Record<string, { referrals: UserProfile[]; loading: boolean }>>({});
  const [bonusContributions, setBonusContributions] = useState<Record<string, number>>({});

  useEffect(() => {
    if (networkLoading || directReferrals.length === 0) {
      setBonusContributions({});
      return;
    }

    const contributions: Record<string, number> = {};
    const now = new Date();

    directReferrals.forEach((ref) => {
      let contribution = 0;
      const isContractActive = ref.estadoPlan !== 'vencido';
      if (isContractActive && (ref.planActivo ?? 0) >= 20 && ref.fechaInicioPlan) {
          const dateValue = ref.fechaInicioPlan as any;
          const startDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
          if (!isNaN(startDate.getTime())) {
              const diffTime = now.getTime() - startDate.getTime();
              if (diffTime > 0) {
                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  const dailyBonus = (ref.planActivo ?? 0) * 0.01;
                  contribution = dailyBonus * diffDays;
              }
          }
      }
      contributions[ref.uid] = parseFloat(contribution.toFixed(2));
    });
    setBonusContributions(contributions);
  }, [directReferrals, networkLoading]);

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
            // This case handles unexpected return values
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

  const { plan2PlusCount } = useMemo(() => {
    if (networkLoading || directReferrals.length === 0) {
      return { plan2PlusCount: 0 };
    }
    const count = directReferrals.filter(ref => (ref.planActivo ?? 0) >= 101).length;
    return { plan2PlusCount: count };
  }, [directReferrals, networkLoading]);

  const residualBonus = 0; // Placeholder

  const levels = [
    { level: 1, required: 10, percentage: plan2PlusCount >= 10 ? 5 : plan2PlusCount * 0.5 },
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
                        <TableHead className="text-white">Plan Activo</TableHead>
                        <TableHead className="text-right text-white">Acción</TableHead>
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
                                        <Badge className={(ref.planActivo ?? 0) > 0 ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}>
                                            {(ref.planActivo ?? 0) > 0 ? formatCurrency(ref.planActivo ?? 0) : 'Inactivo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                    {(() => {
                                        const hasNewInvestment = (ref.planActivo ?? 0) > (ref.inversionAnterior ?? 0);
                                        if (ref.bonoEntregado === 'reclamado') {
                                            return <span className="text-green-400 font-semibold text-sm">Cobrado ✅</span>;
                                        }
                                        if (ref.bonoEntregado === true && hasNewInvestment) {
                                            if ((user?.planActivo ?? 0) > 0) {
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
                                                                        ⚠️ Activa un plan para cobrar
                                                                    </Button>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Según el reglamento, necesitas una inversión activa para generar comisiones de red.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            }
                                        }
                                        if ((ref.planActivo ?? 0) > 0 && ref.bonoEntregado !== true) {
                                             return <Badge variant="outline" className="text-muted-foreground border-gray-600">Esperando Activación</Badge>;
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
                                                                <TableHead className="text-right text-white/70">Plan Activo</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {level2Data[ref.uid].referrals.map(l2ref => (
                                                                <TableRow key={l2ref.uid} className="border-gray-800 hover:bg-gray-800/50">
                                                                    <TableCell className="font-medium text-sm">{l2ref.name}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-sm">{l2ref.email}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant="outline" className={(l2ref.planActivo ?? 0) > 0 ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-400'}>
                                                                            {(l2ref.planActivo ?? 0) > 0 ? formatCurrency(l2ref.planActivo ?? 0) : 'Inactivo'}
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
            <CardDescription>Comisión del 1% sobre el capital de tus invitados directos.</CardDescription>
        </CardHeader>
        <CardContent>
            {networkLoading ? (
                <Skeleton className="h-16 w-full bg-gray-700" />
            ) : user && (user.planActivo ?? 0) >= 101 ? (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-4xl font-bold text-cyan-400">{formatCurrency(primaryResidualBonus)}</span>
                        <Badge className="bg-green-600 text-white">ACTIVO</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Este es el total acumulado del 1% de la inversión de tus directos con plan activo (>= $20) y contrato vigente.</p>
                </div>
            ) : (
                <div className="text-center p-4 rounded-lg bg-gray-900/50">
                     <p className="text-muted-foreground">Invierte $101 o más para activar tu Bono Residual Primario.</p>
                </div>
            )}
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700 text-white" data-ai-hint="residualStatusMonitor">
        <CardHeader>
          <CardTitle>Desglose de Bono Residual Primario</CardTitle>
          <CardDescription>Monitorea el estado de la contribución de cada referido directo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800">
                <TableHead className="text-white">Referido</TableHead>
                <TableHead className="text-white">Bono Aportado</TableHead>
                <TableHead className="text-right text-white">Estado del Contrato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {networkLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-gray-700">
                    <TableCell colSpan={3}><Skeleton className="h-8 w-full bg-gray-700"/></TableCell>
                  </TableRow>
                ))
              ) : directReferrals.length > 0 ? (
                directReferrals.map((ref) => {
                  const isContractActive = ref.estadoPlan !== 'vencido';
                  const bonusContribution = bonusContributions[ref.uid] ?? 0;

                  return (
                    <TableRow key={ref.uid} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="font-medium text-sm">{ref.email}</TableCell>
                      <TableCell className="font-mono text-cyan-400">{formatCurrency(bonusContribution)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={isContractActive ? 'bg-green-600 text-white' : 'bg-red-800 text-white'}>
                          {isContractActive ? 'Activo' : 'Límite Alcanzado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                    No tienes referidos directos que califiquen para este bono.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle>Niveles de Bono Residual</CardTitle>
          <CardDescription>Desbloquea niveles invitando a nuevos miembros con un Plan Plata o superior (≥ $101).</CardDescription>
        </CardHeader>
        <CardContent>
           {networkLoading ? <Skeleton className="h-4 w-32 bg-gray-700 mb-4"/> : <p className="mb-4 text-sm">Directos con Plan 2+: <span className="font-bold text-golden">{plan2PlusCount}</span></p>}
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
        const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction & {id: string}));
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
    return new Date(isoString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
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
                  <TableCell className={`text-right font-semibold ${tx.tipo === 'Bono Directo' ? 'text-green-400' : 'text-white'}`}>
                    {tx.tipo === 'Bono Directo' ? '+ ' : ''}{formatCurrency(tx.monto)}
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

const WithdrawalSection = ({ user, mainBalance, referralBalance }: { user: UserProfile, mainBalance: number, referralBalance: number }) => {
  const { toast } = useToast();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalType, setWithdrawalType] = useState<'referral' | 'main'>('referral');
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  useEffect(() => {
    const checkWindow = () => {
        try {
            const nowInLondon = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
            const day = nowInLondon.getDate();
            const hour = nowInLondon.getHours();
            
            const isOpen = [10, 20, 30, 13].includes(day) && hour >= 6;
            setIsWindowOpen(isOpen);
        } catch (e) {
            console.error("Could not determine London time.", e);
            setIsWindowOpen(false);
        }
    };
    checkWindow();
    const interval = setInterval(checkWindow, 60000); // Re-check every minute
    return () => clearInterval(interval);
  }, []);

  const formSchema = z.object({
    amount: z.coerce.number().positive({ message: 'Por favor, introduce un monto válido.' }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const amount = form.watch('amount');
  const maxAmount = useMemo(() => {
    return withdrawalType === 'referral' ? referralBalance : mainBalance;
  }, [withdrawalType, referralBalance, mainBalance]);


  const isAmountInvalid = amount <= 0 || amount > maxAmount;
  const isButtonDisabled = isSubmitting || isAmountInvalid || (withdrawalType === 'main' && !isWindowOpen);

  const getButtonText = () => {
    if (isSubmitting) return 'Generando...';
    if (withdrawalType === 'main' && !isWindowOpen) {
        return 'Fuera de horario de retiro';
    }
    return 'Generar Token';
  };

  const handleGenerateToken = async (values: z.infer<typeof formSchema>) => {
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
                  <Label htmlFor="r1">Bono Referido (Retiro 24/7)</Label>
              </div>
              <div className="flex items-center space-x-2">
                  <RadioGroupItem value="main" id="r2" />
                  <Label htmlFor="r2">Saldo Actual</Label>
              </div>
            </RadioGroup>

            {withdrawalType === 'main' && (
              <Alert variant="default" className="bg-amber-900/30 border-amber-700/50 text-amber-200 [&>svg]:text-amber-400">
                <Info className="h-4 w-4" />
                <AlertTitle>Aviso de Retiro</AlertTitle>
                <AlertDescription>
                  Retiros disponibles los días 10, 20 y 30 a partir de las 06:00 AM (Hora de Londres).
                </AlertDescription>
              </Alert>
            )}
            
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

export default function TestPage() {
  const { user: profile, loading: authLoading } = useAuth();
  const { t, setLocale } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  
  const [directReferrals, setDirectReferrals] = useState<UserProfile[]>([]);
  const [networkLoading, setNetworkLoading] = useState(true);
  const renderTime = useMemo(() => new Date(), []); // Snapshot of time on component render


  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  const getDailyRate = (planAmount: number, isVip: boolean = false): number => {
    if (isVip) {
        if (planAmount >= 1001) return 0.028; // 2.8%
        if (planAmount >= 501) return 0.026;  // 2.6%
        if (planAmount >= 101) return 0.024;  // 2.4%
        if (planAmount >= 20) return 0.020;   // 2.0%
    } else {
        if (planAmount >= 1001) return 0.025; // 2.5%
        if (planAmount >= 501) return 0.020;  // 2.0%
        if (planAmount >= 101) return 0.018;  // 1.8%
        if (planAmount >= 20) return 0.015;   // 1.5%
    }
    return 0;
  };

  // Fetch direct referrals
  useEffect(() => {
    if (!profile?.uid) {
      setNetworkLoading(false);
      setDirectReferrals([]);
      return;
    }
    
    setNetworkLoading(true);
    const referralsQuery = query(
      collection(db, 'users'),
      where('invitadoPor', '==', profile.uid)
    );
  
    const unsubscribe = onSnapshot(referralsQuery, (snapshot) => {
      const refs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setDirectReferrals(refs);
      setNetworkLoading(false);
    }, (error) => {
      console.error("Error fetching referrals:", error);
      setDirectReferrals([]);
      setNetworkLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);
  
  const { mainBalance, referralBalance, totalLifetimeEarnings, primaryResidualBonus } = useMemo(() => {
    if (!profile || authLoading) {
      return { mainBalance: 0, referralBalance: 0, totalLifetimeEarnings: 0, primaryResidualBonus: 0 };
    }

    const now = renderTime;

    // --- Progressive ROI based on full days ---
    let progressiveROI = 0;
    const planActivo = profile.planActivo ?? 0;
    if (planActivo > 0 && profile.fechaInicioPlan && profile.estadoPlan !== 'vencido') {
        const dateValue = profile.fechaInicioPlan as any;
        const startDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
        if (!isNaN(startDate.getTime())) {
            const diffTime = now.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                progressiveROI = planActivo * getDailyRate(planActivo, profile.isVip ?? false) * diffDays;
            }
        }
    }

    // --- Progressive Residual Bonus based on full days ---
    let progressiveResidual = 0;
    if ((profile.planActivo ?? 0) >= 101) {
        progressiveResidual = directReferrals.reduce((total, ref) => {
            if ((ref.planActivo ?? 0) >= 20 && ref.estadoPlan !== 'vencido' && ref.fechaInicioPlan) {
                const dateValue = ref.fechaInicioPlan as any;
                const startDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
                if (!isNaN(startDate.getTime())) {
                    const diffTime = now.getTime() - startDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                        return total + ((ref.planActivo ?? 0) * 0.01 * diffDays);
                    }
                }
            }
            return total;
        }, 0);
    }
    
    // --- Define final wallet values ---
    
    // "Saldo Actual": Sum of progressive ROI and progressive Residual Bonus.
    const finalMainBalance = parseFloat((progressiveROI + progressiveResidual).toFixed(2));
    
    // "Bono Referido" (Separate wallet for 10% direct bonuses)
    const finalReferralBalance = parseFloat((profile.bonoRetirable || 0).toFixed(2));

    // "Ganancias Generadas" (Total lifetime earnings for progress bar and history)
    // This is the total potential value generated, including all bonus types.
    const totalLifetimeDirect = profile.bonoDirecto || 0;
    const allTimeEarnings = progressiveROI + progressiveResidual + totalLifetimeDirect;

    const maxEarnings = planActivo > 0 ? planActivo * 3 : Infinity;
    const finalTotalLifetimeEarnings = parseFloat(Math.min(allTimeEarnings, maxEarnings).toFixed(2));
    
    // "Bono Residual Primario" (Display card for total accumulated residual)
    const finalPrimaryResidualBonus = parseFloat(progressiveResidual.toFixed(2));

    return { 
        mainBalance: finalMainBalance,
        referralBalance: finalReferralBalance,
        totalLifetimeEarnings: finalTotalLifetimeEarnings,
        primaryResidualBonus: finalPrimaryResidualBonus
    };
  }, [profile, directReferrals, authLoading, renderTime]);


  const statItems = useMemo(() => {
    if (!profile) {
      return [
        { title: t('dashboard.totalInvestment'), value: 0, icon: PiggyBank },
        { title: t('dashboard.generatedEarnings'), value: 0, icon: TrendingUp },
        { title: t('dashboard.totalWithdrawals'), value: 0, icon: CircleDollarSign },
      ];
    }
    return [
      { title: t('dashboard.totalInvestment'), value: profile.planActivo ?? 0, icon: PiggyBank },
      { title: t('dashboard.generatedEarnings'), value: totalLifetimeEarnings, icon: TrendingUp },
      { title: t('dashboard.totalWithdrawals'), value: profile.retirosTotales ?? 0, icon: CircleDollarSign },
    ];
  }, [t, profile, totalLifetimeEarnings]);

  const [chartData, setChartData] = useState<any[]>([]);
  const statsLoading = authLoading;

  // Static Chart Generation Effect
  useEffect(() => {
    if (authLoading || !profile) {
      setChartData([]);
      return;
    }

    const points = 7;
    const data = [];
    // Generate previous points as a simple linear representation of the current earnings.
    for (let i = 0; i < points; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (points - 1 - i));
        const balance = (totalLifetimeEarnings / points) * (i + 1);
        data.push({
            date: date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
            balance: parseFloat(balance.toFixed(2)),
        });
    }
    
    // Ensure the last point is exactly the main balance value and labeled 'Ahora'.
    if (data.length > 0) {
        data[data.length - 1].balance = totalLifetimeEarnings;
        data[data.length - 1].date = 'Ahora';
    } else if (totalLifetimeEarnings > 0) {
        data.push({ date: 'Ahora', balance: totalLifetimeEarnings });
    }

    setChartData(data);
  }, [totalLifetimeEarnings, authLoading, profile]);
  

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };
  
  const userName = profile?.name || t('dashboard.investor');
  const planActivo = profile?.planActivo ?? 0;

  const formattedMainBalance = formatCurrency(mainBalance);
  const formattedReferralBonus = formatCurrency(referralBalance);
  
  const progress = planActivo > 0 ? (totalLifetimeEarnings / (planActivo * 3)) * 100 : 0;

  // Effect for Automatic Cycle Claim
  useEffect(() => {
    if (progress >= 100 && profile && profile.estadoPlan !== 'vencido') {
      const autoClaim = async () => {
        toast({
          title: '¡Ciclo Completado!',
          description: 'Procesando tu reclamo final automáticamente...',
        });
        try {
          const result = await claimAndFinalizeCycle(profile.uid);
          if (result?.success) {
            toast({
              title: '¡Ciclo Reclamado y Finalizado!',
              description: result.message,
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Error en Reclamo Automático',
              description: result?.error || 'No se pudo procesar el reclamo.',
            });
          }
        } catch (e) {
          console.error("Error in autoClaim:", e);
          toast({
            variant: 'destructive',
            title: 'Error de Conexión',
            description: 'No se pudo conectar con el servidor para el reclamo automático.',
          });
        }
      };
      autoClaim();
    }
  }, [progress, profile, toast]);

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
        <AnnouncementMarquee />
      </header>

      <Tabs defaultValue="inicio" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 rounded-none sticky top-16 z-40 backdrop-blur-sm">
          <TabsTrigger value="inicio"><Home className="mr-2 h-4 w-4" /> Inicio</TabsTrigger>
          <TabsTrigger value="inversiones"><Briefcase className="mr-2 h-4 w-4" /> Inversiones</TabsTrigger>
          <TabsTrigger value="profile" asLink href="/profile"><UserIcon className="mr-2 h-4 w-4" />{t('profile.title')}</TabsTrigger>
          <TabsTrigger value="mi-red"><Users className="mr-2 h-4 w-4" /> Mi Red</TabsTrigger>
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
                    <Card className="bg-gray-800 border-golden text-white text-center">
                        <CardHeader>
                        <CardTitle className="text-xl font-medium text-gray-300">
                            Saldo Actual
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-400">Retiros: Días 10, 20 y 30</CardDescription>
                        </CardHeader>
                        <CardContent className="py-2">
                        {authLoading ? (
                            <Skeleton className="h-12 w-1/2 mx-auto bg-gray-700" />
                        ) : (
                            <p className="text-5xl font-bold text-golden">{formattedMainBalance}</p>
                        )}
                        </CardContent>
                    </Card>
                    <Card className="bg-gray-800 border-cyan-400 text-white text-center">
                        <CardHeader>
                        <CardTitle className="text-xl font-medium text-gray-300">
                            Bono Referido
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-400">Retiros: 24/7</CardDescription>
                        </CardHeader>
                        <CardContent className="py-2">
                        {authLoading ? (
                            <Skeleton className="h-12 w-1/2 mx-auto bg-gray-700" />
                        ) : (
                            <p className="text-5xl font-bold text-cyan-400">{formattedReferralBonus}</p>
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
                    <Card className="bg-gray-800 border-gray-700 text-white">
                        <CardHeader>
                            <CardTitle>Estado de Inversión</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {authLoading ? (
                               <Skeleton className="h-20 w-full bg-gray-700" />
                            ) : profile?.estadoPlan === 'vencido' ? (
                                <div className="p-4 text-center bg-red-900/50 border border-red-700 rounded-lg">
                                    <p className="font-bold text-lg text-amber-400">¡CICLO COMPLETADO!</p>
                                    <p className="text-sm text-gray-300 mt-2">
                                        Tienes 3 días para incrementar tu plan o tu cuenta se cerrará.
                                    </p>
                                    {profile.fechaVencimiento && (
                                       <p className="text-sm text-gray-300 mt-2">
                                            Tu cuenta se cerrará aproximadamente el: {new Date(profile.fechaVencimiento).toLocaleDateString('es-ES')}
                                       </p>
                                    )}
                                </div>
                            ) : planActivo > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-lg">Tu plan de inversión: <span className="font-bold text-golden">{formatCurrency(planActivo)} USDT Activo</span></p>
                                    <p className="text-lg">Tasa de ganancia diaria: <span className="font-bold text-cyan-400">{(getDailyRate(planActivo, profile?.isVip ?? false) * 100).toFixed(1)}%</span></p>
                                    <p className="text-lg">Ganancias Totales (Plan + Red): <span className="font-bold text-green-400">{formatCurrency(totalLifetimeEarnings)}</span> / <span className="text-sm text-gray-400" title="Límite de Retorno (300%)">{formatCurrency(planActivo * 3)}</span></p>
                                    {profile?.fechaInicioPlan && new Date(typeof (profile.fechaInicioPlan as any)?.toDate === 'function' ? (profile.fechaInicioPlan as any).toDate() : profile.fechaInicioPlan).toString() !== 'Invalid Date' && <p className="text-sm text-gray-400">Inversión iniciada el: {new Date(typeof (profile.fechaInicioPlan as any)?.toDate === 'function' ? (profile.fechaInicioPlan as any).toDate() : profile.fechaInicioPlan).toLocaleDateString('es-ES')}</p>}
                                </div>
                            ) : (
                                <p>Tu plan de inversión: No tienes un plan activo. Realiza una inversión para obtener uno.</p>
                            )}
                        </CardContent>
                        {planActivo > 0 && profile?.estadoPlan !== 'vencido' && (
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
                    <WithdrawalSection user={profile} mainBalance={mainBalance} referralBalance={referralBalance} />
                  </div>
                )}
                
                {profile && !authLoading && (
                  <div className="w-full max-w-5xl">
                      <TransactionHistory userId={profile.uid} />
                  </div>
                )}

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
        <TabsContent value="inversiones">
           <InvestmentPlansSection />
        </TabsContent>
        <TabsContent value="mi-red">
          <MyNetworkTab user={profile} directReferrals={directReferrals} networkLoading={networkLoading} primaryResidualBonus={primaryResidualBonus} />
        </TabsContent>
      </Tabs>
      <InstallPWA />
    </main>
  );
}
