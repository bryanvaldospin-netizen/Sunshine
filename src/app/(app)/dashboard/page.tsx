'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Camera } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { submitDeposit, getWalletAddress } from '@/lib/actions';
import type { DepositRequest } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const depositSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser positivo.' }),
  proof: z
    .custom<FileList>()
    .refine((files) => files?.length > 0, 'El comprobante es obligatorio.')
    .refine((files) => files?.[0]?.type.startsWith('image/'), 'El archivo debe ser una imagen.'),
});

type DepositStatus = 'idle' | 'success' | 'error';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState('Cargando...');
  const [history, setHistory] = useState<DepositRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('idle');

  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
  });
  
  useEffect(() => {
    if (user) {
      const fetchAddress = async () => {
        const address = await getWalletAddress();
        setWalletAddress(address);
      };
      fetchAddress();

      const q = query(collection(db, 'deposit_requests'), where('userId', '==', user.uid), orderBy('date', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const requests: DepositRequest[] = [];
        querySnapshot.forEach((doc) => {
          requests.push({ id: doc.id, ...doc.data() } as DepositRequest);
        });
        setHistory(requests);
        setLoadingHistory(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Image
          src="https://storage.googleapis.com/studio-images/q/v/qc/user/29be7a44-a035-4309-bbd9-35c8e967a1da/2dd2834b-4f9e-4b7d-b286-dd87f9d850a5.png"
          alt="Sunshine Logo"
          width={80}
          height={80}
          className="animate-pulse"
        />
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({ title: 'Copiado', description: 'Dirección de billetera copiada al portapapeles.' });
  };

  async function onSubmit(values: z.infer<typeof depositSchema>) {
    if (!user) return;
    const formData = new FormData();
    formData.append('amount', values.amount.toString());
    formData.append('proof', values.proof[0]);
    formData.append('userId', user.uid);
    formData.append('userName', user.name);

    const result = await submitDeposit(formData);

    if (result.error) {
      setDepositStatus('error');
    } else {
      setDepositStatus('success');
      form.reset();
    }
  }

  const StatusBadge = ({ status }: { status: DepositRequest['status'] }) => {
    switch (status) {
      case 'Aprobado':
        return <Badge className="bg-yellow-500/20 text-yellow-700">{t('dashboard.statusApproved')}</Badge>;
      case 'Rechazado':
        return <Badge variant="destructive">{t('dashboard.statusRejected')}</Badge>;
      default:
        return <Badge variant="secondary">{t('dashboard.statusPending')}</Badge>;
    }
  };
  
  const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(user?.saldoUSDT ?? 0);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-normal text-muted-foreground">{t('dashboard.balance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold text-golden">{formattedBalance}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t('dashboard.depositTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">{t('dashboard.usdtAddress')}</Label>
                  <div className="flex items-center mt-1">
                    <Input readOnly value={walletAddress} className="bg-gray-100 dark:bg-gray-800" />
                    <Button type="button" size="icon" variant="ghost" onClick={handleCopy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dashboard.amount')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proof"
                  render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                      <FormLabel>{t('dashboard.proof')}</FormLabel>
                      <FormControl>
                         <label className="flex items-center gap-2 cursor-pointer justify-center w-full p-4 border-2 border-dashed rounded-md hover:border-primary">
                            <Camera className="h-5 w-5 text-muted-foreground"/>
                            <span>Seleccionar imagen</span>
                            <Input type="file" className="hidden" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest}/>
                         </label>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white text-lg py-6" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Enviando...' : t('dashboard.sendProof')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t('dashboard.historyTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.date')}</TableHead>
                  <TableHead>{t('dashboard.amount')}</TableHead>
                  <TableHead>{t('dashboard.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory ? (
                  <TableRow><TableCell colSpan={3} className="text-center">Cargando historial...</TableCell></TableRow>
                ) : history.length > 0 ? (
                  history.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                      <TableCell>{req.amount} USDT</TableCell>
                      <TableCell><StatusBadge status={req.status} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center">No hay solicitudes.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={depositStatus !== 'idle'} onOpenChange={() => setDepositStatus('idle')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {depositStatus === 'success' ? t('dashboard.successTitle') : t('dashboard.errorTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {depositStatus === 'success' ? t('dashboard.successBody', { name: user?.name }) : 
              <>
                <p>{t('dashboard.errorBody', { name: user?.name })}</p>
                <p className="mt-2">{t('dashboard.errorBody2')}</p>
              </>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDepositStatus('idle')} className={depositStatus === 'error' ? 'bg-gradient-to-r from-red-600 to-red-800 text-white' : 'bg-gradient-to-r from-golden to-accent text-white'}>
              {depositStatus === 'success' ? t('dashboard.successBtn') : t('dashboard.errorBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
