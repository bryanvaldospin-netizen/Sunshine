'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Ticket, Gem, Cherry, VenetianSlashed } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { spinSlots } from '@/lib/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Symbol = '7' | 'DIAMOND' | 'CHERRY' | 'BAR';

const symbolIcons: Record<Symbol, React.ReactNode> = {
    '7': <p className="text-6xl font-bold text-red-500" style={{ textShadow: '0 0 10px #ef4444' }}>7</p>,
    'DIAMOND': <Gem className="h-16 w-16 text-cyan-300" style={{ filter: 'drop-shadow(0 0 10px #0ff)' }} />,
    'CHERRY': <Cherry className="h-16 w-16 text-red-600" />,
    'BAR': <p className="text-6xl font-bold text-gray-400">BAR</p>,
};

const allSymbols: Symbol[] = ['7', 'DIAMOND', 'CHERRY', 'BAR'];

const Reel = ({ symbol, isSpinning }: { symbol: Symbol; isSpinning: boolean }) => {
    const [displaySymbol, setDisplaySymbol] = useState(symbol);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isSpinning) {
            intervalRef.current = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * allSymbols.length);
                setDisplaySymbol(allSymbols[randomIndex]);
            }, 80);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            setDisplaySymbol(symbol);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isSpinning, symbol]);

    return (
        <div className="h-28 w-24 bg-black/50 rounded-lg flex items-center justify-center border-2 border-golden/50 overflow-hidden">
            <div className={cn("transition-transform duration-100", { "animate-pulse": isSpinning })}>
                {symbolIcons[displaySymbol]}
            </div>
        </div>
    );
};


export default function SlotsPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [reels, setReels] = useState<Symbol[]>(['7', '7', '7']);
    const [isSpinning, setIsSpinning] = useState(false);
    const [tickets, setTickets] = useState(0);
    
    const spinSoundRef = useRef<HTMLAudioElement>(null);
    const winSoundRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (user) {
            setTickets(user.tickets ?? 0);
        }
    }, [user]);

    const handleSpin = async () => {
        if (!user || isSpinning) return;
        if (tickets < 1) {
            toast({ variant: 'destructive', title: 'Sin Tickets', description: 'Necesitas al menos 1 ticket para jugar.' });
            return;
        }
        
        setIsSpinning(true);
        setTickets(prev => prev - 1);
        spinSoundRef.current?.play();

        const result = await spinSlots(user.uid);
        
        setTimeout(() => {
            setIsSpinning(false);
            
            if (!result) {
                toast({
                    variant: 'destructive',
                    title: 'Error de Red',
                    description: 'No se pudo comunicar con el servidor. Tu ticket ha sido devuelto.'
                });
                setTickets(prev => prev + 1);
                return;
            }

            if ('error' in result) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
                setTickets(prev => prev + 1); // Return ticket on error
            } else {
                setReels(result.combination as Symbol[]);
                if (result.prize > 0) {
                    winSoundRef.current?.play();
                    toast({
                        title: '¡GANASTE!',
                        description: `Has ganado ${result.prize.toFixed(2)} USDT.`,
                        className: 'bg-golden border-amber-300 text-black'
                    });
                } else {
                    toast({
                        title: '¡Mala suerte!',
                        description: 'No has ganado esta vez. ¡Sigue intentando!',
                    });
                }
            }
        }, 2000); // 2 seconds of spinning
    };

    return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center gap-6">
            <audio ref={spinSoundRef} src="/sounds/slot-spin.mp3" preload="auto" />
            <audio ref={winSoundRef} src="/sounds/slot-win.mp3" preload="auto" />

            <Card className="w-full max-w-2xl bg-gray-900/80 border-golden text-white shadow-2xl shadow-golden/10">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle>Tragamonedas Clásico</CardTitle>
                    </div>
                    <Link href="/casino">
                        <Button variant="outline" className="border-golden text-golden hover:bg-golden/10">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Casino
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-8">
                    {/* Prize Info */}
                    <div className="flex justify-around w-full text-center text-sm text-gray-400">
                        <div><p>7-7-7</p><p className="font-bold text-golden">$10.00</p></div>
                        <div><p>💎-💎-💎</p><p className="font-bold text-golden">$5.00</p></div>
                        <div><p>🍒 (en cualquier línea)</p><p className="font-bold text-golden">$1.00</p></div>
                    </div>

                    {/* Reels */}
                    <div className="relative p-6 bg-black rounded-xl border-4 border-double border-golden">
                         <div className="flex gap-4">
                            <Reel symbol={reels[0]} isSpinning={isSpinning} />
                            <Reel symbol={reels[1]} isSpinning={isSpinning} />
                            <Reel symbol={reels[2]} isSpinning={isSpinning} />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-full max-w-sm flex flex-col items-center gap-4">
                        <Button
                            onClick={handleSpin}
                            disabled={isSpinning || tickets < 1}
                            className="w-full py-8 text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg disabled:opacity-60"
                        >
                            {isSpinning ? 'GIRANDO...' : '¡GIRAR!'}
                        </Button>

                        <div className="text-center">
                            <p className="text-gray-400">Tus Tickets</p>
                            <p className="text-3xl font-bold text-golden flex items-center justify-center gap-2">
                                <Ticket />
                                <span>{tickets}</span>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
