'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { createWithdrawalToken } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Wallet, Info } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Por favor, introduce un monto válido.' }),
});

export default function MyWithdrawalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const handleGenerateToken = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para realizar esta acción.' });
      return;
    }

    setIsSubmitting(true);
    setGeneratedToken(null);

    const result = await createWithdrawalToken({
      amount: values.amount,
      user: {
        uid: user.uid,
        email: user.email,
        saldoUSDT: user.saldoUSDT,
      },
    });

    if (result.success) {
      setGeneratedToken(result.token);
      toast({ title: '¡Éxito!', description: 'Tu token de retiro ha sido generado.' });
      form.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSubmitting(false);
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      toast({ title: 'Copiado', description: 'Token copiado al portapapeles.' });
    }
  };

  const formatCurrency = (value: number | undefined) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);

  return (
    <div className="bg-gray-900 h-full">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Mis Retiros</h1>
          <Link href="/test-page">
            <Button variant="outline" className="border-golden text-golden hover:bg-golden/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Panel
            </Button>
          </Link>
        </div>
        
        <Card className="w-full shadow-lg bg-[#324254] border-golden text-center">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-300">Saldo Disponible</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold text-white">{formatCurrency(user?.saldoUSDT)}</p>
            </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <Card className="lg:col-span-3 w-full shadow-lg bg-[#324254] border-golden">
              <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Wallet />
                      Solicitar Retiro
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                      Genera un token para autorizar tu solicitud de retiro de fondos.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleGenerateToken)} className="space-y-4">
                  <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Monto a Retirar (USDT)</FormLabel>
                          <FormControl>
                          <Input type="number" placeholder="Ej: 100" {...field} className="bg-gray-700 border-gray-600" />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white" disabled={isSubmitting}>
                      {isSubmitting ? 'Generando...' : 'Generar Token'}
                  </Button>
                  </form>
              </Form>

              {generatedToken && (
                  <div className="mt-8 p-4 border border-golden rounded-lg bg-gray-800/50 text-center">
                      <p className="text-sm text-gray-400 mb-2">Tu token de retiro es:</p>
                      <p className="text-2xl font-mono font-bold text-golden break-all">{generatedToken}</p>
                      <div className="mt-4 flex flex-col sm:flex-row gap-4">
                          <Button onClick={handleCopyToken} variant="outline" className="w-full border-gray-500 text-gray-300 hover:bg-gray-700">
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar Token
                          </Button>
                          <Button asChild className="w-full bg-golden text-black hover:bg-amber-400">
                          <a href="https://form.jotform.com/260687723494065" target="_blank" rel="noopener noreferrer">
                              Completar Retiro en Jotform
                          </a>
                          </Button>
                      </div>
                  </div>
              )}
              </CardContent>
          </Card>

          <Card className="lg:col-span-2 w-full shadow-lg bg-[#324254] border-golden">
              <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Info />
                      Pasos para Retirar
                  </CardTitle>
                  <CardDescription>Sigue estas instrucciones para completar tu retiro.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ol className="list-decimal list-inside space-y-4 text-gray-300">
                      <li>
                          <strong>Genera tu Token:</strong> En el formulario de la izquierda, introduce el monto que deseas retirar y haz clic en 'Generar Token'.
                      </li>
                      <li>
                          <strong>Copia el Token:</strong> Una vez que aparezca tu token, usa el botón 'Copiar Token' para guardarlo en tu portapapeles.
                      </li>
                      <li>
                          <strong>Completa en Jotform:</strong> Haz clic en el botón 'Completar Retiro en Jotform', que te llevará a nuestro formulario seguro. Pega tu token allí para finalizar la solicitud.
                      </li>
                  </ol>
              </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
