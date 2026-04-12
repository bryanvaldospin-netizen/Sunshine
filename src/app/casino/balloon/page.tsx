'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { startBalloonGame, cashOutBalloonGame } from '@/lib/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const BalloonIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <radialGradient id="balloonGradient" cx="0.4" cy="0.4" r="0.6">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D4AF37" />
            </radialGradient>
            <filter id="balloonShine" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
                <feSpecularLighting in="blur" surfaceScale="5" specularConstant=".75" specularExponent="20" lightingColor="#FFF" result="specOut">
                    <fePointLight x="-5000" y="-10000" z="20000" />
                </feSpecularLighting>
                <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut" />
                <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint" />
                <feMerge>
                    <feMergeNode in="litPaint" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <path d="M 50 90 C 20 90 20 60 50 60 C 80 60 80 90 50 90 Z" fill="#D4AF37" />
        <path d="M 47 90 L 53 90 L 50 95 Z" fill="#D4AF37" />
        <circle cx="50" cy="50" r="40" fill="url(#balloonGradient)" filter="url(#balloonShine)" />
        <text x="50" y="52" textAnchor="middle" dy=".3em" fill="black" fontSize="20" fontWeight="bold">S</text>
    </svg>
);

type GameState = 'setup' | 'inflating' | 'burst' | 'cashed_out';

export default function BalloonPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [betAmount, setBetAmount] = useState(0.1);
    const [gameState, setGameState] = useState<GameState>('setup');
    const [gameId, setGameId] = useState<string | null>(null);
    const [burstPoint, setBurstPoint] = useState<number | null>(null);
    const [multiplier, setMultiplier] = useState(1.00);
    const [balance, setBalance] = useState(user?.saldoUSDT ?? 0);
    
    const [isLoading, setIsLoading] = useState(false);
    const animationFrameRef = useRef<number>();
    const startTimeRef = useRef<number>();
    const pumSoundRef = useRef<HTMLAudioElement | null>(null);

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
        setBetAmount(parseFloat(value) || 0);
    };

    const gameLoop = (currentTime: number) => {
        if (!startTimeRef.current || !burstPoint) return;
        const elapsedTime = currentTime - startTimeRef.current;
        
        const newMultiplier = Math.min(50, parseFloat((1 + elapsedTime / 3000).toFixed(2)));
        
        if (newMultiplier >= burstPoint) {
            setMultiplier(burstPoint);
            setGameState('burst');
            pumSoundRef.current?.play();
            cancelAnimationFrame(animationFrameRef.current!);
        } else {
            setMultiplier(newMultiplier);
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
    };
    
    const startInflating = async () => {
        if (gameState !== 'setup' || !user || isLoading) return;
        if (betAmount < 0.1) {
            toast({ variant: 'destructive', title: 'Apuesta Mínima', description: 'La apuesta mínima es de 0.10 USDT.' });
            return;
        }
        if (balance < betAmount) {
            toast({ variant: 'destructive', title: 'Saldo Insuficiente' });
            return;
        }

        setIsLoading(true);
        const result = await startBalloonGame(user.uid, betAmount);
        setIsLoading(false);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Error al iniciar', description: result.error });
            resetGame();
        } else {
            setGameId(result.gameId);
            setBurstPoint(result.burstPoint);
            setGameState('inflating');
            startTimeRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const stopInflatingAndCashOut = async () => {
        if (gameState !== 'inflating' || !gameId || !user || isLoading) return;

        cancelAnimationFrame(animationFrameRef.current!);
        setIsLoading(true);

        const result = await cashOutBalloonGame(user.uid, gameId, multiplier);
        setIsLoading(false);
        
        if (result.error) {
            toast({ variant: 'destructive', title: 'Error al cobrar', description: result.error });
            setGameState('burst'); // Assume it burst if cashout failed
            pumSoundRef.current?.play();
        } else {
            toast({ title: `¡Cobrado en ${multiplier.toFixed(2)}x!`, description: `Has ganado ${result.amountWon.toFixed(2)} USDT.` });
            setGameState('cashed_out');
        }
    };

    const resetGame = () => {
        setGameState('setup');
        setGameId(null);
        setBurstPoint(null);
        setMultiplier(1.00);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const balloonScale = 1 + (multiplier - 1) / 4;

    return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center gap-6">
            <audio ref={pumSoundRef} src="/sounds/pum.mp3" preload="auto" />
            <Card className="w-full max-w-4xl bg-gray-900/80 border-amber-500 text-white overflow-hidden">
                 <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle>El Balón de Oro</CardTitle>
                    </div>
                    <Link href="/casino">
                        <Button variant="outline" className="border-amber-400 text-amber-400 hover:bg-amber-400/10">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Casino
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                     {/* Controls Section */}
                    <div className="md:col-span-1 space-y-6 flex flex-col justify-between">
                        <Card className="bg-gray-800 p-6 border-gray-700">
                             <CardTitle className="text-lg mb-4">Tu Apuesta</CardTitle>
                             <div className="space-y-4">
                                <label htmlFor="bet-amount" className="text-sm text-gray-400">Monto (USDT)</label>
                                <Input
                                    id="bet-amount"
                                    type="number"
                                    value={betAmount}
                                    onChange={handleBetChange}
                                    min="0.1"
                                    step="0.1"
                                    disabled={gameState !== 'setup'}
                                    className="bg-gray-700 border-gray-600 focus-visible:ring-amber-500"
                                />
                             </div>
                        </Card>
                        <div className="text-center">
                            <p className="text-gray-400">Tu Saldo</p>
                            <p className="text-4xl font-bold text-green-400">
                                ${balance.toFixed(2)}
                            </p>
                        </div>
                    </div>
                     {/* Balloon Section */}
                    <div className="md:col-span-2 relative aspect-square bg-black/30 rounded-lg flex items-center justify-center p-4 overflow-hidden">
                       <div 
                         className="absolute flex items-center justify-center transition-transform duration-100 ease-linear"
                         style={{ transform: `scale(${gameState === 'inflating' ? balloonScale : 1})` }}
                       >
                         <BalloonIcon className={cn("h-40 w-40 text-golden", { 'animate-pulse': gameState === 'inflating' })} />
                         <div className="absolute text-center">
                            <div className={cn("text-5xl font-bold text-black transition-colors duration-300", 
                                {'text-red-600': gameState === 'burst'}
                            )}>
                                {multiplier.toFixed(2)}x
                            </div>
                         </div>
                       </div>
                       
                       {(gameState === 'burst' || gameState === 'cashed_out') && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center rounded-lg animate-in fade-in-0">
                                {gameState === 'burst' && <h2 className="text-4xl font-bold text-red-500">💥 ¡EL BALÓN EXPLOTÓ!</h2>}
                                {gameState === 'cashed_out' && <h2 className="text-4xl font-bold text-green-400">¡GANASTE ${(betAmount * multiplier).toFixed(2)}!</h2>}
                                <Button onClick={resetGame} className="mt-6 w-1/2 bg-golden text-black hover:bg-amber-400">
                                Jugar de Nuevo
                                </Button>
                            </div>
                        )}
                        
                        {gameState === 'setup' && (
                             <Button 
                                onMouseDown={startInflating}
                                onTouchStart={(e) => { e.preventDefault(); startInflating(); }}
                                disabled={isLoading || betAmount <= 0 || balance < betAmount} 
                                className="w-3/4 py-8 text-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg z-10"
                            >
                                INFLAR
                            </Button>
                        )}
                         {gameState === 'inflating' && (
                             <Button 
                                onMouseUp={stopInflatingAndCashOut}
                                onTouchEnd={(e) => { e.preventDefault(); stopInflatingAndCashOut(); }}
                                disabled={isLoading} 
                                className="w-3/4 py-8 text-2xl bg-green-600 hover:bg-green-700 shadow-lg z-10"
                            >
                                COBRAR ${(betAmount * multiplier).toFixed(2)}
                            </Button>
                        )}
                         {gameState === 'setup' && balance < betAmount && <p className="absolute bottom-4 text-red-500 text-center text-sm mt-2 z-20">Saldo insuficiente.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
