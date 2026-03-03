'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getWalletAddress, submitDeposit } from '@/lib/actions';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DepositRequest } from '@/types';
import SplashScreen from '@/components/splash-screen';
import { Badge } from '@/components/ui/badge';
import { Clipboard, Upload } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [walletAddress, setWalletAddress] = useState('');
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    getWalletAddress().then(setWalletAddress);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    setRequestsLoading(true);
    const q = query(
      collection(db, 'deposit_requests'), 
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userRequests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));
      setRequests(userRequests);
      setRequestsLoading(false);
    }, (error) => {
      console.error("Error fetching deposit requests:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el historial de solicitudes.' });
      setRequestsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, toast]);

  const copyToClipboard = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast({ title: 'Copiado', description: 'Dirección de billetera copiada al portapapeles.' });
  };
  
  const handleDepositSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión.' });
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const proofFile = formData.get('proof') as File;
    if (proofFile.size === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un archivo de comprobante.' });
        setIsSubmitting(false);
        return;
    }

    formData.append('userId', user.uid);
    formData.append('userName', user.name);

    const result = await submitDeposit(formData);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error al enviar', description: result.error });
    } else {
      toast({ title: 'Solicitud enviada', description: 'Tu solicitud de depósito está siendo revisada.' });
      (event.target as HTMLFormElement).reset();
      setSelectedFileName(null);
    }

    setIsSubmitting(false);
  };
  
  const getStatusComponent = (status: DepositRequest['status']) => {
    const statusMap: Record<DepositRequest['status'], { variant: 'default' | 'secondary' | 'destructive'; key: string }> = {
      'Aprobado': { variant: 'default', key: 'dashboard.statusApproved' },
      'Rechazado': { variant: 'destructive', key: 'dashboard.statusRejected' },
      'Pendiente': { variant: 'secondary', key: 'dashboard.statusPending' },
    };
    const { variant, key } = statusMap[status];
    return <Badge variant={variant}>{t(key)}</Badge>;
  };
  
  const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(user?.saldoUSDT ?? 0);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="text-center shadow-lg bg-gradient-to-br from-card to-secondary">
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
            <CardDescription>Sigue los pasos para añadir fondos a tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('dashboard.usdtAddress')}</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={walletAddress} className="bg-muted cursor-pointer" onClick={copyToClipboard} />
                  <Button type="button" variant="outline" size="icon" onClick={copyToClipboard}>
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Transfiere únicamente USDT en la red TRC-20 a esta dirección.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{t('dashboard.amount')}</Label>
                <Input id="amount" name="amount" type="number" placeholder="100.00" required step="0.01" min="0.01" />
              </div>

              <div className="space-y-2">
                 <Label htmlFor="proof">{t('dashboard.proof')}</Label>
                 <div className="relative">
                    <Button asChild variant="outline" className="w-full justify-start text-muted-foreground font-normal overflow-hidden">
                      <label htmlFor="proof" className="cursor-pointer flex items-center">
                        <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{selectedFileName || 'Seleccionar archivo...'}</span>
                      </label>
                    </Button>
                    <Input 
                      id="proof" 
                      name="proof" 
                      type="file" 
                      required 
                      accept="image/*" 
                      className="absolute w-full h-full top-0 left-0 opacity-0 cursor-pointer"
                      onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name ?? null)}
                    />
                 </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : t('dashboard.sendProof')}
              </Button>
            </form>
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
                  <TableHead className="text-right">{t('dashboard.amount')}</TableHead>
                  <TableHead className="text-right">{t('dashboard.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">Cargando historial...</TableCell></TableRow>
                ) : requests.length > 0 ? (
                  requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-medium">{req.amount} USDT</TableCell>
                      <TableCell className="text-right">{getStatusComponent(req.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No hay solicitudes todavía.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
