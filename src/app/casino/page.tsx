'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dices, ArrowLeft, Gem, Bomb, Rocket, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';


const BalloonIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12.5 22C16.9183 22 20.5 18.4183 20.5 14C20.5 9.58172 16.9183 6 12.5 6C8.08172 6 4.5 9.58172 4.5 14C4.5 18.4183 8.08172 22 12.5 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.5 6C12.5 3.79086 10.7091 2 8.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.5 22L12.5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const SlotMachineIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="3" y1="15" x2="21" y2="15"></line>
        <path d="M16 3v18"></path>
        <path d="M8 3v18"></path>
    </svg>
);


export default function CasinoHubPage() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState(user?.tickets ?? 0);

    useEffect(() => {
        if (user) {
            setTickets(user.tickets ?? 0);
        }
    }, [user]);

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center gap-8">
        <Card className="w-full max-w-5xl bg-gray-900/80 border-golden text-white">
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
                
                <p className="text-gray-300">Selecciona un juego para comenzar a ganar.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    <Card className="bg-gray-800/80 border-golden/50 text-white flex flex-col items-center justify-between p-6 text-center hover:border-golden hover:shadow-lg hover:shadow-golden/20 transition-all">
                        <Gem className="h-16 w-16 text-amber-400" style={{filter: 'drop-shadow(0 0 8px #fbbd23)'}} />
                        <CardHeader className="p-2">
                            <CardTitle className="text-2xl font-bold text-golden">La Ruleta de la Suerte</CardTitle>
                        </CardHeader>
                        <CardDescription className="text-gray-400 mb-4 h-20">
                            Gira la ruleta y prueba tu suerte. ¡Premios instantáneos de hasta $20 te esperan! (Costo: 1 Ticket)
                        </CardDescription>
                        <Link href="/casino/roulette" className="w-full">
                            <Button className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
                                Jugar a la Ruleta
                            </Button>
                        </Link>
                    </Card>

                    <Card className="bg-gray-800/80 border-cyan-400/50 text-white flex flex-col items-center justify-between p-6 text-center hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-400/20 transition-all">
                        <Bomb className="h-16 w-16 text-cyan-400" style={{filter: 'drop-shadow(0 0 8px #0ff)'}} />
                         <CardHeader className="p-2">
                            <CardTitle className="text-2xl font-bold text-cyan-300">La Mina de Oro</CardTitle>
                        </CardHeader>
                        <CardDescription className="text-gray-400 mb-4 h-20">
                            Encuentra los diamantes y evita las minas para multiplicar tu apuesta. (Costo: 1 Ticket)
                        </CardDescription>
                        <Link href="/casino/mines" className="w-full">
                            <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                                Jugar a la Mina
                            </Button>
                        </Link>
                    </Card>
                    
                    <Card className="bg-gray-800/80 border-purple-400/50 text-white flex flex-col items-center justify-between p-6 text-center hover:border-purple-400 hover:shadow-lg hover:shadow-purple-400/20 transition-all">
                        <Rocket className="h-16 w-16 text-purple-400" style={{filter: 'drop-shadow(0 0 8px #a855f7)'}} />
                         <CardHeader className="p-2">
                            <CardTitle className="text-2xl font-bold text-purple-300">El Vuelo del León</CardTitle>
                        </CardHeader>
                        <CardDescription className="text-gray-400 mb-4 h-20">
                            Apuesta y retírate antes de que el león se desplome. ¡Multiplica tus USDT! (Costo: Saldo USDT)
                        </CardDescription>
                        <Link href="/casino/crash" className="w-full">
                            <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                                Jugar a Crash
                            </Button>
                        </Link>
                    </Card>

                    <Card className="bg-gray-800/80 border-amber-400/50 text-white flex flex-col items-center justify-between p-6 text-center hover:border-amber-400 hover:shadow-lg hover:shadow-amber-400/20 transition-all">
                        <BalloonIcon className="h-16 w-16 text-amber-400" style={{filter: 'drop-shadow(0 0 8px #fbbd23)'}} />
                         <CardHeader className="p-2">
                            <CardTitle className="text-2xl font-bold text-amber-300">El Balón de Oro</CardTitle>
                        </CardHeader>
                        <CardDescription className="text-gray-400 mb-4 h-20">
                            Infla el balón y cobra antes de que explote. ¡Controla tu riesgo y tu recompensa! (Costo: Saldo USDT)
                        </CardDescription>
                        <Link href="/casino/balloon" className="w-full">
                            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                Jugar a Inflar
                            </Button>
                        </Link>
                    </Card>
                    
                    <Card className="bg-gray-800/80 border-red-400/50 text-white flex flex-col items-center justify-between p-6 text-center hover:border-red-400 hover:shadow-lg hover:shadow-red-400/20 transition-all">
                        <SlotMachineIcon className="h-16 w-16 text-red-400" style={{filter: 'drop-shadow(0 0 8px #f87171)'}} />
                         <CardHeader className="p-2">
                            <CardTitle className="text-2xl font-bold text-red-300">Tragamonedas Clásico</CardTitle>
                        </CardHeader>
                        <CardDescription className="text-gray-400 mb-4 h-20">
                            Alinea los símbolos y gana premios instantáneos. ¡Busca el 777! (Costo: 1 Ticket)
                        </CardDescription>
                        <Link href="/casino/slots" className="w-full">
                            <Button className="w-full bg-gradient-to-r from-red-500 to-rose-500 text-white">
                                Jugar a Slots
                            </Button>
                        </Link>
                    </Card>

                </div>
            </CardContent>
        </Card>
    </div>
  );
}
