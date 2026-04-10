'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bomb, Gem, ArrowLeft, Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { startMinesGame, revealMinesSquare, cashOutMines } from '@/lib/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

const GRID_SIZE = 25;

type Tile = {
  isRevealed: boolean;
  isMine: boolean;
};

export default function MinesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [numMines, setNumMines] = useState(5);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'busted' | 'cashed_out'>('setup');
  const [grid, setGrid] = useState<Tile[]>(() => Array(GRID_SIZE).fill({ isRevealed: false, isMine: false }));
  const [gameId, setGameId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [gemsFound, setGemsFound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [tickets, setTickets] = useState(user?.tickets ?? 0);

  const diamondSoundRef = useRef<HTMLAudioElement>(null);
  const mineSoundRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (user) {
      setTickets(user.tickets ?? 0);
    }
  }, [user]);

  const nextMultiplier = useMemo(() => {
    if (gameState !== 'playing') return 0;
    const remainingTiles = GRID_SIZE - gemsFound;
    const remainingMines = numMines;
    const remainingGems = remainingTiles - remainingMines;
    if (remainingGems <= 0) return 0;

    const probOfNext = remainingGems / remainingTiles;
    return multiplier / probOfNext;
  }, [gemsFound, numMines, multiplier, gameState]);

  const handleStartGame = async () => {
    if (!user) return;
    if (tickets <= 0) {
      toast({ variant: 'destructive', title: 'Sin Tickets', description: 'Necesitas al menos 1 ticket para jugar.' });
      return;
    }

    setIsLoading(true);
    const result = await startMinesGame(user.uid, numMines);
    setIsLoading(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      setGameId(result.gameId);
      setGameState('playing');
      setGrid(Array(GRID_SIZE).fill({ isRevealed: false, isMine: false }));
      setGemsFound(0);
      setMultiplier(1);
      setTickets(prev => prev - 1);
    }
  };

  const handleTileClick = async (index: number) => {
    if (gameState !== 'playing' || isLoading || grid[index].isRevealed || !gameId || !user) return;

    setIsLoading(true);
    const result = await revealMinesSquare(gameId, user.uid, index);
    setIsLoading(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
      return;
    }

    const newGrid = [...grid];
    newGrid[index] = { ...newGrid[index], isRevealed: true };

    if (result.isMine) {
      newGrid[index].isMine = true;
      setGrid(newGrid);
      setGameState('busted');
      mineSoundRef.current?.play();
    } else {
      newGrid[index].isMine = false;
      setGemsFound(result.gemsFound);
      setMultiplier(result.multiplier);
      setGrid(newGrid);
      diamondSoundRef.current?.play();
    }
  };

  const handleCashOut = async () => {
    if (gameState !== 'playing' || isLoading || !gameId || !user) return;

    setIsLoading(true);
    const result = await cashOutMines(gameId, user.uid);
    setIsLoading(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: '¡Cobrado!', description: `Has ganado ${result.amountWon.toFixed(2)} USDT. Se ha añadido a tu billetera.` });
      setGameState('cashed_out');
    }
  };

  const resetGame = () => {
    setGameState('setup');
    setGameId(null);
    setGemsFound(0);
    setMultiplier(1);
  };

  const winnings = useMemo(() => (multiplier - 1), [multiplier]);

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center gap-6">
      <audio ref={diamondSoundRef} src="/sounds/diamond.mp3" preload="auto" />
      <audio ref={mineSoundRef} src="/sounds/mine.mp3" preload="auto" />

      <Card className="w-full max-w-4xl bg-gray-900/80 border-cyan-500 text-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Bomb className="text-cyan-400 h-6 w-6" />
            <CardTitle>La Mina de Oro</CardTitle>
          </div>
          <Link href="/casino">
            <Button variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Casino
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Controls Section */}
          <div className="md:col-span-1 space-y-6 flex flex-col justify-between">
            {gameState === 'setup' ? (
              <Card className="bg-gray-800 p-6 border-gray-700">
                <CardTitle className="text-lg mb-4">Configurar Partida</CardTitle>
                <div className="space-y-4">
                  <Label htmlFor="mines-slider">Número de Minas: <span className="text-cyan-400 font-bold text-xl">{numMines}</span></Label>
                  <Slider
                    id="mines-slider"
                    min={1}
                    max={20}
                    step={1}
                    value={[numMines]}
                    onValueChange={(value) => setNumMines(value[0])}
                    className="[&>span>span]:bg-cyan-400"
                    disabled={isLoading}
                  />
                </div>
                <div className="mt-6 text-center">
                    <p className="text-gray-400">Costo por partida</p>
                    <p className="text-2xl font-bold text-golden flex items-center justify-center gap-2">
                        <Ticket /> <span>1</span>
                    </p>
                </div>
                <Button onClick={handleStartGame} disabled={isLoading || tickets <= 0} className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-lg py-6">
                  {isLoading ? 'Empezando...' : '¡Empezar Juego!'}
                </Button>
                 {tickets <= 0 && <p className="text-red-500 text-sm text-center mt-2">No tienes tickets.</p>}
              </Card>
            ) : (
              <Card className="bg-gray-800 p-6 border-gray-700 text-center">
                <CardTitle className="text-lg mb-2">Partida en Curso</CardTitle>
                <div className="space-y-3 my-4">
                    <div>
                        <p className="text-sm text-gray-400">Diamantes Encontrados</p>
                        <p className="text-3xl font-bold text-white">{gemsFound}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Ganancia Actual (x{multiplier.toFixed(2)})</p>
                        <p className="text-4xl font-bold text-green-400">{winnings.toFixed(2)} <span className="text-lg">USDT</span></p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-400">Próximo Diamante</p>
                        <p className="text-2xl font-bold text-cyan-400">x{nextMultiplier.toFixed(2)}</p>
                    </div>
                </div>
                <Button onClick={handleCashOut} disabled={isLoading || gemsFound === 0} className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6">
                  Cobrar {winnings.toFixed(2)} USDT
                </Button>
              </Card>
            )}
            
            <div className="text-center">
                <p className="text-gray-400">Tus Tickets de la Suerte</p>
                <p className="text-4xl font-bold text-golden flex items-center justify-center gap-2">
                    <Ticket />
                    <span>{tickets}</span>
                </p>
            </div>
          </div>

          {/* Grid Section */}
          <div className="md:col-span-2 relative">
            <div className="grid grid-cols-5 grid-rows-5 gap-2 aspect-square">
              {grid.map((tile, index) => (
                <button
                  key={index}
                  onClick={() => handleTileClick(index)}
                  disabled={gameState !== 'playing' || tile.isRevealed || isLoading}
                  className={cn(
                    "relative w-full h-full rounded-md border-2 border-golden/50 flex items-center justify-center transition-all duration-300 transform-gpu",
                    !tile.isRevealed && "bg-gray-800/80 hover:bg-gray-700/80 cursor-pointer",
                    tile.isRevealed && !tile.isMine && "bg-green-500/10 border-green-500 scale-95",
                    tile.isRevealed && tile.isMine && "bg-red-500/20 border-red-500 scale-95",
                  )}
                >
                  {tile.isRevealed && (
                    <div className="animate-in fade-in-0 zoom-in-75">
                      {tile.isMine ? (
                        <Bomb className="h-8 w-8 text-red-500" />
                      ) : (
                        <Gem className="h-8 w-8 text-cyan-300" style={{filter: 'drop-shadow(0 0 5px #0ff)'}}/>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {(gameState === 'busted' || gameState === 'cashed_out') && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center rounded-lg animate-in fade-in-0">
                {gameState === 'busted' ? (
                  <>
                    <Bomb className="h-20 w-20 text-red-500 mb-4" />
                    <h2 className="text-4xl font-bold text-red-500">¡MINA ENCONTRADA!</h2>
                    <p className="text-gray-300 mt-2">Perdiste la apuesta de esta ronda.</p>
                  </>
                ) : (
                   <>
                    <Gem className="h-20 w-20 text-green-400 mb-4" />
                    <h2 className="text-4xl font-bold text-green-400">¡GANASTE!</h2>
                    <p className="text-gray-300 mt-2">Cobraste {winnings.toFixed(2)} USDT.</p>
                  </>
                )}
                <Button onClick={resetGame} className="mt-6 w-1/2 bg-golden text-black hover:bg-amber-400">
                  Jugar de Nuevo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
