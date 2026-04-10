'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dices, ArrowLeft, Gem, Bomb } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';

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
                
                <p className="text-gray-300">Selecciona un juego para comenzar a ganar.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                    <Card className="bg-gray-800/80 border-golden/50 text-white flex flex-col items-center justify-between p-6 text-center hover:border-golden hover:shadow-lg hover:shadow-golden/20 transition-all">
                        <Gem className="h-16 w-16 text-amber-400" style={{filter: 'drop-shadow(0 0 8px #fbbd23)'}} />
                        <CardHeader className="p-2">
                            <CardTitle className="text-2xl font-bold text-golden">La Ruleta de la Suerte</CardTitle>
                        </CardHeader>
                        <CardDescription className="text-gray-400 mb-4">
                            Gira la ruleta y prueba tu suerte. ¡Premios instantáneos te esperan!
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
                        <CardDescription className="text-gray-400 mb-4">
                            Encuentra los diamantes y evita las minas para multiplicar tu apuesta.
                        </CardDescription>
                        <Link href="/casino/mines" className="w-full">
                            <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                                Jugar a la Mina
                            </Button>
                        </Link>
                    </Card>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}