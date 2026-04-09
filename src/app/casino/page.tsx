'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Ticket, Star, Frown, Dices, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { spinRoulette } from '@/lib/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const prizes = [
  { amount: 0, label: "Nada", color: "bg-gray-700/50" },
  { amount: 0.5, label: "$0.50", color: "bg-amber-600/50" },
  { amount: 1, label: "$1.00", color: "bg-gray-600/50" },
  { amount: 2, label: "$2.00", color: "bg-amber-500/50" },
  { amount: 3, label: "$3.00", color: "bg-gray-500/50" },
  { amount: 5, label: "$5.00", color: "bg-amber-400/50" },
  { amount: 10, label: "$10.00", color: "bg-gray-400/50" },
  { amount: 20, label: "$20.00", color: "bg-amber-300/50" },
];

const Roulette = ({ rotation, transition, segments }: { rotation: number, transition: string, segments: typeof prizes }) => {
    const segmentAngle = 360 / segments.length;
  
    return (
      <div className="relative w-80 h-80 md:w-96 md:h-96 mx-auto">
        <div 
          className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full bg-gray-900 border-4 border-amber-300 z-20"
        />
        <div 
          className="w-full h-full rounded-full border-8 border-gray-900/80 shadow-inner"
          style={{ 
            transition: `transform ${transition}`,
            transform: `rotate(${rotation}deg)`,
            background: `conic-gradient(
              from 90deg,
              #42200e 0deg 45deg,
              #1a1a1a 45deg 90deg,
              #42200e 90deg 135deg,
              #1a1a1a 135deg 180deg,
              #42200e 180deg 225deg,
              #1a1a1a 225deg 270deg,
              #42200e 270deg 315deg,
              #1a1a1a 315deg 360deg
            )`
          }}
        >
          {segments.map((segment, index) => {
            const rotate = index * segmentAngle;
            return (
              <div
                key={index}
                className="absolute w-1/2 h-1/2 origin-bottom-right flex items-center justify-start pl-4"
                style={{
                  transform: `rotate(${rotate}deg)`,
                  clipPath: `polygon(0 0, 100% 0, 100% 2px, calc(50% * tan(${segmentAngle/2}deg)) 50%, 100% calc(100% - 2px), 100% 100%, 0 100%)`
                }}
              >
                <div 
                  className="text-white font-bold text-lg md:text-xl text-shadow-md" 
                  style={{transform: `rotate(${segmentAngle / 2 - 90}deg) translate(0, -50%)`}}
                >
                  <span className="block transform -rotate-45">{segment.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div 
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 
            border-l-[15px] border-l-transparent
            border-r-[15px] border-r-transparent
            border-t-[30px] border-t-amber-400 z-10"
        />
      </div>
    );
};


export default function CasinoPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [tickets, setTickets] = useState(user?.tickets ?? 0);

    useEffect(() => {
        if (user) {
            setTickets(user.tickets ?? 0);
        }
    }, [user]);


    const handleSpin = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para jugar." });
            return;
        }
        if (tickets <= 0) {
            toast({ variant: "destructive", title: "Sin Tickets", description: "No tienes tickets para girar la ruleta." });
            return;
        }
        if (isSpinning) return;
    
        setIsSpinning(true);
        setTickets(prev => prev - 1);
    
        try {
            const result = await spinRoulette(user.uid);
            
            if (result.error) {
                // Refund ticket if server-side validation fails
                setTickets(prev => prev + 1);
                throw new Error(result.error);
            }
            
            // Add extra spins for excitement
            const baseSpins = 5;
            const newRotation = rotation + (baseSpins * 360) + result.finalAngle;
            setRotation(newRotation);
    
            setTimeout(() => {
                setIsSpinning(false);
                if (result.prize > 0) {
                    toast({
                        title: "¡Felicidades!",
                        description: `Has ganado ${result.prize.toFixed(2)} USDT. Se han añadido a tu Saldo de Billetera.`,
                    });
                } else {
                    toast({
                        title: "¡Mala suerte!",
                        description: "No has ganado nada esta vez. ¡Mejor suerte para la próxima!",
                    });
                }
            }, 6000); // Should match the transition duration
    
        } catch (error: any) {
            setIsSpinning(false);
            setTickets(prev => prev + 1); // Refund ticket on client if any error happens
            toast({
                variant: "destructive",
                title: "Error al Girar",
                description: error.message || "No se pudo comunicar con el servidor.",
            });
        }
    };
    
  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center gap-8">
        <Card className="w-full max-w-4xl bg-gray-900/80 border-golden text-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <Dices className="text-golden h-6 w-6" />
                    <CardTitle>Sunshine Casino</CardTitle>
                </div>
                <Link href="/dashboard">
                    <Button variant="outline" className="border-golden text-golden hover:bg-golden/10">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-8 pt-8">

                <div className="text-center">
                    <p className="text-gray-400">Tus Tickets de la Suerte</p>
                    <p className="text-4xl font-bold text-golden flex items-center justify-center gap-2">
                        <Ticket />
                        <span>{tickets}</span>
                    </p>
                </div>

                <Roulette rotation={rotation} transition="6s cubic-bezier(0.25, 0.1, 0.25, 1)" segments={prizes} />
                
                <Button 
                    onClick={handleSpin} 
                    disabled={isSpinning || tickets <= 0}
                    className="w-full max-w-sm bg-gradient-to-r from-golden to-red-800 text-white text-lg py-6 disabled:opacity-50"
                >
                    {isSpinning ? 'Girando...' : 'Girar la Ruleta'}
                </Button>

                 {tickets <= 0 && !isSpinning && (
                    <Card className="bg-gray-800 border-gray-700 text-center p-6 w-full max-w-md mt-4">
                        <CardHeader>
                            <CardTitle>¿Sin Tickets?</CardTitle>
                            <CardDescription>¡Has usado tu tiro diario! Adquiere más tickets para seguir jugando.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
                             <Button asChild className="bg-green-600 hover:bg-green-500 text-white">
                                <a href="https://form.jotform.com/260646464495063" target="_blank" rel="noopener noreferrer">Invertir en 5 Tickets ($4.99)</a>
                            </Button>
                            <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white">
                                <a href="https://form.jotform.com/260646464495063" target="_blank" rel="noopener noreferrer">Invertir en 10 Tickets ($9.99)</a>
                            </Button>
                        </CardContent>
                    </Card>
                )}

            </CardContent>
        </Card>
    </div>
  );
}
