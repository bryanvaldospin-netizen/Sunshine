'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Rocket } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { startCrashGame, cashOutCrashGame } from '@/lib/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { AreaChart, Area, YAxis, XAxis, ResponsiveContainer } from 'recharts';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';


const LionIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a24,24,0,1,1-24-24A24,24,0,0,1,176,128ZM80,128a24,24,0,1,1,24-24A24,24,0,0,1,80,128Z" fill="currentColor"/>
    </svg>
);


type GameState = 'setup' | 'playing' | 'crashed';
type ChartData = { time: number; multiplier: number };

export default function CrashPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [betAmount, setBetAmount] = useState(1);
    const [gameState, setGameState] = useState<GameState>('setup');
    const [gameId, setGameId] = useState<string | null>(null);
    const [crashPoint, setCrashPoint] = useState<number | null>(null);
    const [multiplier, setMultiplier] = useState(1.00);
    const [chartData, setChartData] = useState<ChartData[]>([{ time: 0, multiplier: 1 }]);
    const [lionPosition, setLionPosition] = useState(0);
    
    const [isLoading, setIsLoading] = useState(false);
    const animationFrameRef = useRef<number>();
    const startTimeRef = useRef<number>();
    
    const [balance, setBalance] = useState(user?.saldoUSDT ?? 0);

    useEffect(() => {
        if (user?.uid) {
            const userDocRef = doc(db, 'users', user.uid);
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setBalance(docSnap.data().saldoUSDT ?? 0);
                }
            });
            return () => unsubscribe();
        }
    }, [user?.uid]);

    const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setBetAmount(parseFloat(value));
    };

    const handleStartGame = async () => {
        if (!user || !betAmount || betAmount <= 0) {
            toast({ variant: 'destructive', title: 'Apuesta inválida', description: 'Introduce un monto de apuesta válido.' });
            return;
        }
        if (balance < betAmount) {
            toast({ variant: 'destructive', title: 'Saldo insuficiente', description: 'No tienes suficientes USDT para esta apuesta.' });
            return;
        }

        setIsLoading(true);
        const result = await startCrashGame(user.uid, betAmount);
        setIsLoading(false);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Error al iniciar', description: result.error });
        } else {
            setGameId(result.gameId);
            setCrashPoint(result.crashPoint);
            setGameState('playing');
            setMultiplier(1.00);
            setLionPosition(0);
            setChartData([{ time: 0, multiplier: 1 }]);
            startTimeRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const handleCashOut = async () => {
        if (gameState !== 'playing' || !gameId || !user) return;
        
        cancelAnimationFrame(animationFrameRef.current!);
        setIsLoading(true);

        const result = await cashOutCrashGame(user.uid, gameId, multiplier);
        
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error al cobrar', description: result.error });
            setGameState('setup');
        } else {
            toast({ title: `¡Cobrado en ${multiplier.toFixed(2)}x!`, description: `Has ganado ${result.amountWon.toFixed(2)} USDT.` });
            setGameState('setup');
        }
        setIsLoading(false);
    };

    const gameLoop = (currentTime: number) => {
        if (!startTimeRef.current || !crashPoint) return;
        const elapsedTime = currentTime - startTimeRef.current;
        
        const newMultiplier = parseFloat((1 * Math.pow(1.07, elapsedTime / 1000)).toFixed(2));
        
        if (newMultiplier >= crashPoint) {
            setMultiplier(crashPoint);
            setChartData(prevData => [...prevData, {time: elapsedTime, multiplier: crashPoint}]);
            setGameState('crashed');
        } else {
            setMultiplier(newMultiplier);
            setChartData(prevData => [...prevData, {time: elapsedTime, multiplier: newMultiplier}]);
            
            const progress = (newMultiplier - 1) / (crashPoint - 1);
            setLionPosition(Math.min(90, progress * 100));

            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
    };

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const resetGame = () => {
        setGameState('setup');
        setGameId(null);
        setCrashPoint(null);
        setMultiplier(1.00);
        setChartData([{ time: 0, multiplier: 1 }]);
        setLionPosition(0);
    };

    const currentWinnings = useMemo(() => {
        return (betAmount * multiplier).toFixed(2);
    }, [betAmount, multiplier]);

    return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center gap-6">
            <Card className="w-full max-w-4xl bg-gray-900/80 border-purple-500 text-white">
                 <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Rocket className="text-purple-400 h-6 w-6" />
                        <CardTitle>El Vuelo del León</CardTitle>
                    </div>
                    <Link href="/casino">
                        <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400/10">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Casino
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                     {/* Controls Section */}
                    <div className="md:col-span-1 space-y-6 flex flex-col justify-between">
                        <Card className="bg-gray-800 p-6 border-gray-700">
                             <CardTitle className="text-lg mb-4">Configurar Apuesta</CardTitle>
                             <div className="space-y-4">
                                <label htmlFor="bet-amount" className="text-sm text-gray-400">Monto de Apuesta (USDT)</label>
                                <Input
                                    id="bet-amount"
                                    type="number"
                                    value={betAmount}
                                    onChange={handleBetChange}
                                    min="0.1"
                                    step="0.1"
                                    disabled={gameState !== 'setup'}
                                    className="bg-gray-700 border-gray-600 focus-visible:ring-purple-500"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="secondary" onClick={() => setBetAmount(1)} disabled={gameState !== 'setup'}>1</Button>
                                    <Button variant="secondary" onClick={() => setBetAmount(5)} disabled={gameState !== 'setup'}>5</Button>
                                    <Button variant="secondary" onClick={() => setBetAmount(10)} disabled={gameState !== 'setup'}>10</Button>
                                    <Button variant="secondary" onClick={() => setBetAmount(25)} disabled={gameState !== 'setup'}>25</Button>
                                </div>
                             </div>
                              <Button onClick={handleStartGame} disabled={gameState !== 'setup' || isLoading || betAmount <= 0 || balance < betAmount} className="w-full mt-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-lg py-6">
                                {isLoading ? 'Iniciando...' : '¡Iniciar Vuelo!'}
                            </Button>
                            {gameState === 'setup' && balance < betAmount && <p className="text-red-500 text-center text-sm mt-2">Saldo insuficiente.</p>}
                        </Card>
                        <div className="text-center">
                            <p className="text-gray-400">Tu Saldo</p>
                            <p className="text-4xl font-bold text-green-400">
                                ${balance.toFixed(2)}
                            </p>
                        </div>
                    </div>
                     {/* Chart Section */}
                    <div className="md:col-span-2 relative aspect-video bg-black/30 rounded-lg flex items-center justify-center p-4 overflow-hidden">
                       {gameState === 'setup' && (
                           <div className="text-center text-gray-500">
                               <LionIcon className="h-24 w-24 mx-auto text-golden opacity-20" />
                               <p className="mt-4">Define tu apuesta para comenzar el vuelo.</p>
                           </div>
                       )}

                       {(gameState === 'playing' || gameState === 'crashed') && (
                        <>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none">
                                <h2 className={cn(
                                    "text-6xl font-bold transition-colors duration-300",
                                    gameState === 'playing' && 'text-white',
                                    gameState === 'crashed' && 'text-red-500 animate-pulse'
                                )}>
                                    {multiplier.toFixed(2)}x
                                </h2>
                                {gameState === 'crashed' && <p className="text-red-400 font-semibold mt-2">💥 ¡EL LEÓN SALIÓ VOLANDO!</p>}
                            </div>

                             <LionIcon 
                                className={cn("absolute h-10 w-10 text-golden z-20 transition-all duration-100 ease-linear",
                                    gameState === 'crashed' && 'opacity-0 scale-150 animate-ping'
                                )}
                                style={{
                                    bottom: `${5 + lionPosition * 0.8}%`,
                                    left: '50%',
                                    transform: 'translateX(-50%)'
                                }}
                            />

                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="crashGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <YAxis domain={[1, 'dataMax + 0.5']} hide />
                                    <XAxis dataKey="time" hide />
                                    <Area 
                                        type="monotone" 
                                        dataKey="multiplier" 
                                        stroke={gameState === 'crashed' ? '#ef4444' : '#D4AF37'}
                                        fill={gameState === 'crashed' ? 'url(#crashGradient)' : 'url(#chartGradient)'}
                                        strokeWidth={4} 
                                        isAnimationActive={false} 
                                        dot={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </>
                       )}
                       
                       {(gameState === 'crashed') && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center rounded-lg animate-in fade-in-0">
                                <Button onClick={resetGame} className="mt-6 w-1/2 bg-golden text-black hover:bg-amber-400">
                                Jugar de Nuevo
                                </Button>
                            </div>
                        )}
                        
                        {gameState === 'playing' && (
                            <Button 
                                onClick={handleCashOut}
                                disabled={isLoading}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 py-8 text-2xl bg-green-600 hover:bg-green-700 shadow-lg">
                                Cobrar ${currentWinnings}
                            </Button>
                        )}

                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
