'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Sparkles, User } from 'lucide-react';
import { asistenteVirtual, type AssistantInput } from '@/ai/flows/asistente-flow';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export default function AsistentePage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const historyForApi = messages.map(msg => ({
            role: msg.role,
            content: [{ text: msg.content }]
        }));

      const result = await asistenteVirtual({
        history: historyForApi,
        message: input,
      });

      const modelMessage: Message = { role: 'model', content: result };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error al contactar al asistente:', error);
      const errorMessage: Message = {
        role: 'model',
        content: 'Lo siento, no puedo responder en este momento. Por favor, intenta más tarde.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  }

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-3xl h-[80vh] flex flex-col bg-gray-900/80 border-golden text-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <Sparkles className="text-golden h-6 w-6" />
                    <CardTitle>Asistente Virtual Sunshine</CardTitle>
                </div>
                 <Link href="/dashboard">
                    <Button variant="outline" className="border-golden text-golden hover:bg-golden/10">
                        Volver al Panel
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                 {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-8">
                        <p>¿Cómo puedo ayudarte a invertir hoy?</p>
                    </div>
                 )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.role === 'model' && (
                            <Avatar className="h-8 w-8 bg-black border-2 border-golden">
                                <AvatarFallback className="bg-transparent"><Sparkles className="h-4 w-4 text-golden" /></AvatarFallback>
                            </Avatar>
                        )}
                        <div className={`max-w-xs md:max-w-md p-3 rounded-xl ${msg.role === 'user' ? 'bg-golden text-black rounded-br-none' : 'bg-gray-800 text-white rounded-bl-none'}`}>
                           <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === 'user' && (
                             <Avatar className="h-8 w-8 bg-gray-700 border-2 border-gray-600">
                                <AvatarFallback className="bg-transparent"><User className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8 bg-black border-2 border-golden">
                            <AvatarFallback className="bg-transparent"><Sparkles className="h-4 w-4 text-golden animate-pulse" /></AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-800 p-3 rounded-xl rounded-bl-none">
                            <p className="text-sm text-gray-400 animate-pulse">Pensando...</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-4 border-t border-gray-700">
                <div className="flex w-full items-center space-x-2">
                    <Input
                        type="text"
                        placeholder="Escribe tu pregunta sobre inversiones..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                        disabled={isLoading}
                        className="bg-gray-800 border-gray-600 focus-visible:ring-golden"
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading} className="bg-golden text-black hover:bg-amber-400 disabled:opacity-50">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
