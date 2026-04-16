'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Star, Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { startBingoGame, claimBingoWin } from '@/lib/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type GameState = 'setup' | 'playing' | 'won';
type WinType = 'line' | 'bingo' | null;

const BingoNumberSphere = ({ number, isNew }: { number: number; isNew: boolean }) => (
    <div className={cn("relative h-12 w-12 rounded-full flex items-center justify-center bg-gray-700 border-2 border-gray-600", { "bg-golden border-amber-300 animate-in fade-in zoom-in-50": isNew })}>
        <span className={cn("text-lg font-bold", { "text-black": isNew, "text-white": !isNew })}>{number}</span>
    </div>
);

export default function BingoPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [gameState, setGameState] = useState<GameState>('setup');
    const [gameId, setGameId] = useState<string | null>(null);
    const [card, setCard] = useState<(number | null)[]>([]);
    const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
    const [markedIndices, setMarkedIndices] = useState<[number, number][]>([]);
    const [isBingoActive, setIsBingoActive] = useState(false);
    const [winType, setWinType] = useState<WinType>(null);
    const [tickets, setTickets] = useState(user?.tickets ?? 0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) setTickets(user.tickets ?? 0);
    }, [user]);

    const checkWinCondition = useCallback(() => {
        if (card.length === 0) return;
        const allMarked = [...markedIndices, [2, 2]]; // Include free space

        const isMarked = (r: number, c: number) => allMarked.some(([row, col]) => row === r && col === c);

        // Check rows
        for (let r = 0; r < 5; r++) {
            if (isMarked(r, 0) && isMarked(r, 1) && isMarked(r, 2) && isMarked(r, 3) && isMarked(r, 4)) {
                setWinType('line');
                setIsBingoActive(true);
                return;
            }
        }
        // Check columns
        for (let c = 0; c < 5; c++) {
            if (isMarked(0, c) && isMarked(1, c) && isMarked(2, c) && isMarked(3, c) && isMarked(4, c)) {
                setWinType('line');
                setIsBingoActive(true);
                return;
            }
        }
        // Check diagonals
        if (isMarked(0, 0) && isMarked(1, 1) && isMarked(2, 2) && isMarked(3, 3) && isMarked(4, 4)) {
             setWinType('line');
             setIsBingoActive(true);
             return;
        }
        if (isMarked(0, 4) && isMarked(1, 3) && isMarked(2, 2) && isMarked(3, 1) && isMarked(4, 0)) {
            setWinType('line');
            setIsBingoActive(true);
            return;
        }

        // Check for BINGO (full card)
        if (allMarked.length === 25) {
            setWinType('bingo');
            setIsBingoActive(true);
            return;
        }

    }, [card, markedIndices]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        checkWinCondition();

        const uncalledNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !calledNumbers.includes(n));

        const interval = setInterval(() => {
            if (uncalledNumbers.length > 0) {
                const randomIndex = Math.floor(Math.random() * uncalledNumbers.length);
                const newNumber = uncalledNumbers.splice(randomIndex, 1)[0];
                setCalledNumbers(prev => [...prev, newNumber]);
            } else {
                clearInterval(interval);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [gameState, checkWinCondition, calledNumbers]);

    const handleStartGame = async () => {
        if (!user) return;
        if (tickets < 1) {
            toast({ variant: 'destructive', title: 'Sin Tickets' });
            return;
        }
        setIsLoading(true);
        const result = await startBingoGame(user.uid);
        setIsLoading(false);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            setGameId(result.gameId);
            setCard(result.card);
            setGameState('playing');
            setTickets(prev => prev - 1);
            setCalledNumbers([]);
            setMarkedIndices([]);
            setIsBingoActive(false);
            setWinType(null);
        }
    };

    const handleMarkNumber = (row: number, col: number) => {
        const index = row * 5 + col;
        const number = card[index];
        if (gameState !== 'playing' || (number !== null && !calledNumbers.includes(number))) {
            return;
        }
        if (!markedIndices.some(([r, c]) => r === row && c === col)) {
            setMarkedIndices(prev => [...prev, [row, col]]);
        }
    };
    
    const handleClaimBingo = async () => {
        if (!user || !gameId || !isBingoActive || !winType) return;
        
        setIsLoading(true);
        const result = await claimBingoWin(user.uid, gameId, winType, markedIndices, calledNumbers);
        setIsLoading(false);

        if (result.error) {
            toast({ variant: 'destructive', title: 'Error al reclamar', description: result.error });
        } else {
            setGameState('won');
            toast({ title: '¡BINGO!', description: `Has ganado ${result.prize.toFixed(2)} USDT.` });
        }
    };

    const displayedCalledNumbers = useMemo(() => calledNumbers.slice(-5).reverse(), [calledNumbers]);

    return (
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center gap-6">
            <Card className="w-full max-w-4xl bg-gray-900/80 border-amber-500 text-white overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Bingo Sunshine</CardTitle>
                    <Link href="/casino">
                        <Button variant="outline" className="border-amber-400 text-amber-400 hover:bg-amber-400/10">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Casino
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Panel */}
                    <div className="md:col-span-1 space-y-4">
                        <Card className="bg-gray-800 p-4 border-gray-700">
                             <CardTitle className="text-lg mb-4">Números Cantados</CardTitle>
                             <div className="flex gap-2 justify-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    displayedCalledNumbers[i] ? <BingoNumberSphere key={i} number={displayedCalledNumbers[i]} isNew={i === 0} /> : <div key={i} className="h-12 w-12 rounded-full bg-gray-900/50"/>
                                ))}
                             </div>
                        </Card>
                         <Card className="bg-gray-800 p-4 border-gray-700 text-center">
                            <p className="text-gray-400">Tus Tickets</p>
                            <p className="text-3xl font-bold text-golden flex items-center justify-center gap-2">
                                <Ticket /><span>{tickets}</span>
                            </p>
                        </Card>
                        <Card className="bg-gray-800 p-4 border-gray-700 text-center">
                             <CardTitle className="text-lg mb-2">Premios</CardTitle>
                             <div className="text-left space-y-1 text-sm">
                                 <p><span className="font-bold text-golden">Línea:</span> $0.50 USDT</p>
                                 <p><span className="font-bold text-golden">Cartón Lleno:</span> $1.00 USDT</p>
                             </div>
                        </Card>
                    </div>

                    {/* Bingo Card */}
                    <div className="md:col-span-2 flex flex-col items-center justify-center">
                        {gameState === 'setup' ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4">
                                <p className="text-center text-gray-400">¿Listo para probar tu suerte?</p>
                                <Button onClick={handleStartGame} disabled={isLoading || tickets < 1} className="w-full max-w-xs py-8 text-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                                    Jugar (1 Ticket)
                                </Button>
                                {tickets < 1 && <p className="text-red-500 text-sm">No tienes tickets suficientes.</p>}
                            </div>
                        ) : (
                            <div className="aspect-square w-full max-w-md bg-black/30 rounded-lg p-2 grid grid-cols-5 gap-2">
                                {card.length > 0 && Array.from({ length: 25 }).map((_, index) => {
                                    const r = Math.floor(index / 5);
                                    const c = index % 5;
                                    const num = card[index];
                                    const isMarked = markedIndices.some(([mr, mc]) => mr === r && mc === c);
                                    const isFreeSpace = index === 12;
                                    
                                    return (
                                        <button 
                                            key={index}
                                            onClick={() => handleMarkNumber(r, c)}
                                            disabled={gameState !== 'playing'}
                                            className={cn(
                                                "w-full h-full rounded-md flex items-center justify-center text-lg font-bold transition-colors duration-300",
                                                {"bg-gray-800 border-2 border-golden/50 text-white": !isMarked && !isFreeSpace},
                                                {"bg-golden text-black border-2 border-amber-300": isMarked || isFreeSpace},
                                                {"cursor-pointer hover:bg-gray-700": gameState === 'playing' && !isMarked && num !== null && calledNumbers.includes(num)},
                                                {"opacity-50": gameState === 'playing' && !isMarked && num !== null && !calledNumbers.includes(num) && !isFreeSpace}
                                            )}
                                        >
                                            {isFreeSpace ? <Star className="h-6 w-6"/> : num}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                         {gameState === 'playing' && 
                            <Button onClick={handleClaimBingo} disabled={!isBingoActive || isLoading} className="w-full max-w-md mt-4 py-6 text-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50">
                                ¡BINGO!
                            </Button>
                         }
                         {gameState === 'won' && 
                             <div className="mt-4 text-center">
                                <h2 className="text-2xl font-bold text-green-400">¡GANASTE!</h2>
                                <Button onClick={handleStartGame} disabled={isLoading || tickets < 1} className="mt-4 bg-golden text-black">Jugar de Nuevo</Button>
                             </div>
                         }
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
