'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ListChecks, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { mockMatches } from '@/lib/mock-matches';
import type { Match, Bet } from '@/types';
import { cn } from '@/lib/utils';
import { placeBet } from '@/lib/actions';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

type BetSelection = {
  match: Match & { matchDescription: string };
  betOn: string;
  odds: number;
};

const BetSlip = ({ selection, onPlaceBet, onClear, balance }: { selection: BetSelection | null; onPlaceBet: (amount: number) => void; onClear: () => void; balance: number }) => {
  const [amount, setAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const potentialWinnings = useMemo(() => {
    if (!selection || !amount) return 0;
    return amount * selection.odds;
  }, [selection, amount]);
  
  const handlePlaceBet = async () => {
    if (!amount || amount <= 0) return;
    setIsLoading(true);
    await onPlaceBet(amount);
    setIsLoading(false);
    setAmount(0);
  }

  useEffect(() => {
    setAmount(0);
  }, [selection]);

  if (!selection) {
    return (
      <Card className="bg-gray-800/80 border-gray-700 text-white sticky top-20">
        <CardHeader>
          <CardTitle>Boleto de Apuesta</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-400">
          <p>Selecciona una cuota para comenzar tu apuesta.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
      <Card className="bg-gray-800/80 border-golden text-white sticky top-20">
        <CardHeader>
          <CardTitle>Boleto de Apuesta</CardTitle>
          <button onClick={onClear} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="bg-black/30 p-3 rounded-lg">
                <p className="text-sm text-gray-300">{selection.match.matchDescription}</p>
                <div className="flex justify-between items-center mt-1">
                    <p className="font-bold text-lg text-white">Tu selección: <span className="text-golden">{selection.betOn}</span></p>
                    <p className="font-bold text-lg text-white">@{selection.odds.toFixed(2)}</p>
                </div>
            </div>
            <div>
                <Label htmlFor="bet-amount">Monto de Apuesta (USDT)</Label>
                <Input id="bet-amount" type="number" value={amount > 0 ? amount : ''} placeholder="0.00" onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="bg-gray-700 border-gray-600 focus-visible:ring-golden mt-1" />
                {amount > balance && <p className="text-xs text-red-500 mt-1">Saldo insuficiente. Disponible: ${balance.toFixed(2)}</p>}
            </div>
            <div className="flex justify-between text-lg">
                <span>Ganancia Potencial:</span>
                <span className="font-bold text-green-400">${potentialWinnings.toFixed(2)}</span>
            </div>
            <Button onClick={handlePlaceBet} disabled={isLoading || amount <= 0 || amount > balance} className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
                {isLoading ? "Apostando..." : "Realizar Apuesta"}
            </Button>
        </CardContent>
      </Card>
  );
};

const MyBetsTab = () => {
    const { user } = useAuth();
    const [bets, setBets] = useState<Bet[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setIsLoading(false);
            return;
        };
        const q = query(collection(db, 'users', user.uid, 'bets'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching bets:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user?.uid]);
    
    if (isLoading) return <div className="text-center p-8">Cargando tus apuestas...</div>;
    if (bets.length === 0) return <div className="text-center p-8 text-gray-400">No tienes apuestas realizadas.</div>;

    return (
        <div className="space-y-4">
            {bets.map(bet => (
                 <Card key={bet.id} className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-white">{bet.matchDescription}</p>
                            <p className="text-sm text-gray-400">Selección: <span className="text-golden font-medium">{bet.betOn}</span> @{bet.odds.toFixed(2)}</p>
                             <p className="text-sm text-gray-400">Apostado: <span className="font-medium text-white">${bet.amount.toFixed(2)}</span></p>
                        </div>
                        <div className="text-right">
                             <Badge className={cn({
                                'bg-yellow-500 text-black': bet.status === 'pendiente',
                                'bg-green-500 text-white': bet.status === 'ganada',
                                'bg-red-500 text-white': bet.status === 'perdida',
                            })}>{bet.status}</Badge>
                             <p className="text-xs text-gray-500 mt-1">{new Date(bet.createdAt).toLocaleString('es-ES')}</p>
                        </div>
                    </CardContent>
                 </Card>
            ))}
        </div>
    );
};


export default function PronosticosPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selection, setSelection] = useState<BetSelection | null>(null);

    const handleSelectOdd = (match: Match, betOn: string, odds: number) => {
        setSelection({ match: {...match, matchDescription: `${match.teamA.name} vs ${match.teamB.name}`}, betOn, odds });
    };

    const handlePlaceBet = async (amount: number) => {
        if (!user || !selection) return;

        const result = await placeBet({
            userId: user.uid,
            matchId: selection.match.id,
            sport: selection.match.sport,
            matchDescription: `${selection.match.teamA.name} vs ${selection.match.teamB.name}`,
            betOn: selection.betOn,
            odds: selection.odds,
            amount,
        });

        if (result.success) {
            toast({ title: '¡Éxito!', description: result.message });
            setSelection(null);
        } else {
            toast({ variant: 'destructive', title: 'Error al apostar', description: result.error });
        }
    };

  return (
    <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-golden flex items-center gap-3"><ListChecks /> Pronósticos Deportivos</h1>
             <Link href="/dashboard">
                <Button variant="outline" className="border-golden text-golden hover:bg-golden/10">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Panel
                </Button>
            </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Tabs defaultValue="futbol" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                        <TabsTrigger value="futbol">Fútbol</TabsTrigger>
                        <TabsTrigger value="basketball">Basketball</TabsTrigger>
                        <TabsTrigger value="mis-apuestas">Mis Apuestas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="futbol" className="mt-6 space-y-4">
                        {mockMatches.filter(m => m.sport === 'Fútbol').map(match => (
                            <Card key={match.id} className="bg-gray-800/50 border-gray-700 text-white">
                                <CardHeader className="pb-2">
                                    <CardDescription>{match.league} - {match.time}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 font-bold text-lg">
                                        <Image src={match.teamA.logo} alt={match.teamA.name} width={24} height={24} className="bg-white rounded-full"/>
                                        {match.teamA.name}
                                        <span className="text-gray-500">vs</span>
                                        {match.teamB.name}
                                        <Image src={match.teamB.logo} alt={match.teamB.name} width={24} height={24} className="bg-white rounded-full"/>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant={selection?.match.id === match.id && selection?.betOn === match.teamA.name ? "default" : "outline"} onClick={() => handleSelectOdd(match, match.teamA.name, match.odds.teamA)} className="border-golden text-golden data-[state=active]:bg-golden data-[state=active]:text-black hover:bg-golden/20">1: {match.odds.teamA.toFixed(2)}</Button>
                                        {match.odds.draw && <Button variant={selection?.match.id === match.id && selection?.betOn === 'Empate' ? "default" : "outline"} onClick={() => handleSelectOdd(match, 'Empate', match.odds.draw!)} className="border-golden text-golden data-[state=active]:bg-golden data-[state=active]:text-black hover:bg-golden/20">X: {match.odds.draw.toFixed(2)}</Button>}
                                        <Button variant={selection?.match.id === match.id && selection?.betOn === match.teamB.name ? "default" : "outline"} onClick={() => handleSelectOdd(match, match.teamB.name, match.odds.teamB)} className="border-golden text-golden data-[state=active]:bg-golden data-[state=active]:text-black hover:bg-golden/20">2: {match.odds.teamB.toFixed(2)}</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                    <TabsContent value="basketball" className="mt-6 space-y-4">
                         {mockMatches.filter(m => m.sport === 'Basketball').map(match => (
                            <Card key={match.id} className="bg-gray-800/50 border-gray-700 text-white">
                                <CardHeader className="pb-2">
                                    <CardDescription>{match.league} - {match.time}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 font-bold text-lg">
                                        <Image src={match.teamA.logo} alt={match.teamA.name} width={24} height={24} className="bg-white rounded-full"/>
                                        {match.teamA.name}
                                        <span className="text-gray-500">vs</span>
                                        {match.teamB.name}
                                        <Image src={match.teamB.logo} alt={match.teamB.name} width={24} height={24} className="bg-white rounded-full"/>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant={selection?.match.id === match.id && selection?.betOn === match.teamA.name ? "default" : "outline"} onClick={() => handleSelectOdd(match, match.teamA.name, match.odds.teamA)} className="border-golden text-golden data-[state=active]:bg-golden data-[state=active]:text-black hover:bg-golden/20">{match.odds.teamA.toFixed(2)}</Button>
                                        <Button variant={selection?.match.id === match.id && selection?.betOn === match.teamB.name ? "default" : "outline"} onClick={() => handleSelectOdd(match, match.teamB.name, match.odds.teamB)} className="border-golden text-golden data-[state=active]:bg-golden data-[state=active]:text-black hover:bg-golden/20">{match.odds.teamB.toFixed(2)}</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                    <TabsContent value="mis-apuestas" className="mt-6">
                        <MyBetsTab />
                    </TabsContent>
                </Tabs>
            </div>
            <div className="lg:col-span-1">
                <BetSlip selection={selection} onPlaceBet={handlePlaceBet} onClear={() => setSelection(null)} balance={user?.saldoUSDT ?? 0} />
            </div>
        </div>
    </div>
  );
}
