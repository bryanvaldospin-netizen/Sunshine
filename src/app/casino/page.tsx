'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Ticket, Dices, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { spinRoulette } from '@/lib/actions';
import Link from 'next/link';

const prizes = [
  { amount: 0, label: "Nada" },
  { amount: 0.5, label: "$0.50" },
  { amount: 1, label: "$1.00" },
  { amount: 2, label: "$2.00" },
  { amount: 3, label: "$3.00" },
  { amount: 5, label: "$5.00" },
  { amount: 10, label: "$10.00" },
  { amount: 20, label: "$20.00" },
];

const Roulette = ({ rotation, transition, segments }: { rotation: number; transition: string; segments: typeof prizes }) => {
    const numSegments = segments.length;
    const anglePerSegment = 360 / numSegments;
    const radius = 160;
    const viewBoxSize = radius * 2 + 40;
    const center = viewBoxSize / 2;
    
    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = {
            x: x + radius * Math.cos(startAngle * Math.PI / 180),
            y: y + radius * Math.sin(startAngle * Math.PI / 180),
        };
        const end = {
            x: x + radius * Math.cos(endAngle * Math.PI / 180),
            y: y + radius * Math.sin(endAngle * Math.PI / 180),
        };
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        return `M ${x},${y} L ${start.x},${start.y} A ${radius},${radius} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`;
    };

    return (
        <div className="relative w-80 h-80 md:w-96 md:h-96 mx-auto" style={{ filter: "drop-shadow(0 0 10px rgba(212, 175, 55, 0.4))" }}>
            <div
                className="w-full h-full"
                style={{
                    transition: `transform ${transition}`,
                    transform: `rotate(${rotation}deg)`,
                }}
            >
                <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-full">
                    <defs>
                        <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                           <stop offset="0%" stopColor="#FBBF24" />
                           <stop offset="100%" stopColor="#D4AF37" />
                        </linearGradient>
                    </defs>
                    <g transform={`rotate(-${anglePerSegment / 2}, ${center}, ${center})`}>
                        {segments.map((segment, i) => {
                            const startAngle = i * anglePerSegment;
                            const endAngle = startAngle + anglePerSegment;
                            const textAngle = startAngle + anglePerSegment / 2;
                            const textRadius = radius * 0.65;
                            
                            const textX = center + textRadius * Math.cos(textAngle * Math.PI / 180);
                            const textY = center + textRadius * Math.sin(textAngle * Math.PI / 180);

                            return (
                                <g key={i}>
                                    <path
                                        d={describeArc(center, center, radius, startAngle, endAngle)}
                                        fill={i % 2 === 0 ? '#111827' : 'url(#gold-gradient)'}
                                        stroke="#000"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={textX}
                                        y={textY}
                                        dy="0.35em"
                                        transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                                        textAnchor="middle"
                                        fill={i % 2 === 0 ? '#FFFFFF' : '#111827'}
                                        fontSize="18"
                                        fontWeight="bold"
                                        className="[paint-order:stroke]"
                                        stroke={i % 2 === 0 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.3)"}
                                        strokeWidth="0.5px"
                                    >
                                        {segment.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
            
            <div 
                aria-hidden="true"
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 
                border-l-[15px] border-l-transparent
                border-r-[15px] border-r-transparent
                border-t-[30px] border-t-amber-400 z-10"
            />
            <div 
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-900 border-4 border-amber-300 z-20 shadow-inner"
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
                setTickets(prev => prev + 1);
                throw new Error(result.error);
            }
            
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
            }, 6000);
    
        } catch (error: any) {
            setIsSpinning(false);
            setTickets(prev => prev + 1);
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
                    <div className="text-center mt-4 w-full max-w-md">
                        <p className="text-gray-400 mb-4">¡Has usado tu tiro diario! Adquiere más tickets para seguir jugando.</p>
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
                                <DialogFooter>
                                    <Button asChild className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
                                        <a href="https://www.jotform.com/form/260646464495063" target="_blank" rel="noopener noreferrer">
                                            Solicitar Tickets
                                        </a>
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

            </CardContent>
        </Card>
    </div>
  );
}
