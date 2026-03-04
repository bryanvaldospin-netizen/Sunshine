'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SplashScreen from '@/components/splash-screen';
import type { UserProfile } from '@/types';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getWalletAddress, submitDeposit } from '@/lib/actions';
import { Copy, Upload } from 'lucide-react';

const depositFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser mayor a 0.' }),
  proof: z
    .any()
    .refine((files) => files?.length == 1, 'Debes subir un comprobante.')
    .refine((files) => files?.[0]?.size <= 5000000, `El tamaño máximo del archivo es 5MB.`)
    .refine(
      (files) => ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type),
      'Solo se permiten archivos .jpg, .png y .webp.'
    ),
});


const DepositCard = ({ user }: { user: UserProfile | null }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getWalletAddress().then(setWalletAddress);
  }, []);

  const form = useForm<z.infer<typeof depositFormSchema>>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: undefined,
      proof: undefined,
    },
  });

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast({ title: t('dashboard.copy'), description: 'Dirección de billetera copiada al portapapeles.' });
  };

  async function onSubmit(values: z.infer<typeof depositFormSchema>) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para depositar.' });
      return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('amount', values.amount.toString());
    formData.append('proof', values.proof[0]);
    formData.append('userId', user.uid);
    formData.append('userName', user.name);

    try {
        const result = await submitDeposit(formData);

        if (result?.error) {
          toast({ variant: 'destructive', title: 'Error al depositar', description: result.error });
        } else {
          toast({ title: '¡Comprobante enviado!', description: 'Tu solicitud de depósito está siendo revisada.' });
          form.reset();
        }
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error inesperado', description: error.message || 'Ocurrió un problema al enviar el formulario.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="bg-gray-800 border-golden text-white w-full">
      <CardHeader>
        <CardTitle>{t('dashboard.depositTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="wallet-address">{t('dashboard.usdtAddress')}</Label>
          <div className="flex items-center gap-2">
            <Input id="wallet-address" readOnly value={walletAddress} className="bg-gray-700 border-gray-600 truncate" placeholder="Cargando dirección..."/>
            <Button variant="outline" size="icon" onClick={handleCopy} className="border-golden text-golden hover:bg-golden/10 hover:text-golden flex-shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dashboard.amount')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100.00" {...field} className="bg-gray-700 border-gray-600" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="proof"
              render={({ field: { onChange, onBlur, name, ref } }) => (
                <FormItem>
                  <FormLabel>{t('dashboard.proof')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Button asChild variant="outline" className="w-full border-dashed border-gray-500 hover:border-golden text-gray-300">
                            <label htmlFor="proof-upload" className="cursor-pointer flex items-center justify-center">
                                <Upload className="mr-2 h-4 w-4" />
                                <span className="truncate">{form.watch('proof')?.[0]?.name || 'Seleccionar archivo'}</span>
                            </label>
                        </Button>
                        <Input 
                            id="proof-upload"
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onBlur={onBlur}
                            name={name}
                            ref={ref}
                            onChange={(e) => onChange(e.target.files)}
                        />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white text-lg py-6" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : t('dashboard.sendProof')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};


export default function TestPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return <SplashScreen />;
  }

  const balance = user?.saldoUSDT ?? 0;

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(balance);

  return (
    <main className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-body p-4 md:p-8 space-y-8">
      <div className="w-full max-w-sm">
        <Card className="bg-gray-800 border-golden text-white text-center">
          <CardHeader>
            <CardTitle className="text-xl font-medium text-gray-300">
              {t('dashboard.balance')}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <p className="text-6xl font-bold text-golden">{formattedBalance}</p>
          </CardContent>
        </Card>
      </div>
      <div className="w-full max-w-sm">
        <DepositCard user={user} />
      </div>
    </main>
  );
}
