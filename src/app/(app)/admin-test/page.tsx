'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { approveDeposit, rejectDeposit, logoutUser } from '@/lib/actions';
import type { UserProfile, DepositRequest } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Eye, CheckCircle, XCircle, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminTestPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const usersQuery = query(collection(db, 'users'));
    const depositsQuery = query(collection(db, 'deposit_requests'), where('status', '==', 'Pendiente'));

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => (doc.data() as UserProfile));
      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
    });

    const unsubscribeDeposits = onSnapshot(depositsQuery, (snapshot) => {
      const depositsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));
      setDeposits(depositsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching deposits:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch deposit requests.' });
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeDeposits();
    };
  }, []);

  const handleApprove = async (requestId: string, userId: string, amount: number) => {
    const result = await approveDeposit({ requestId, userId, amount });
    if (result.success) {
      toast({ title: 'Éxito', description: 'Depósito aprobado y saldo actualizado.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  const handleReject = async (requestId: string) => {
    const result = await rejectDeposit({ requestId });
    if (result.success) {
      toast({ title: 'Éxito', description: 'Depósito rechazado.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = '/login';
  };
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Panel de Control Maestro</h1>
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposits">Solicitudes de Depósito ({deposits.length})</TabsTrigger>
          <TabsTrigger value="users">Usuarios Registrados ({users.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Pendientes</CardTitle>
              <CardDescription>Revisa y aprueba los depósitos de los usuarios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p>No hay solicitudes de depósito pendientes.</p>
                </div>
              ) : (
                deposits.map((deposit) => (
                  <Card key={deposit.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                    <div className="space-y-1 flex-grow">
                      <p className="font-semibold">{deposit.userName}</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(deposit.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(deposit.date).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />Ver Comprobante</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Comprobante de {deposit.userName}</DialogTitle>
                            <DialogDescription>
                              Comprobante de transferencia subido por el usuario para validar la solicitud de depósito.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="relative h-[70vh]">
                            <Image
                              src={deposit.comprobanteURL}
                              alt={`Comprobante de ${deposit.userName}`}
                              fill
                              style={{ objectFit: 'contain' }}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="destructive" size="sm" onClick={() => handleReject(deposit.id)}>
                        <XCircle className="mr-2 h-4 w-4" />Rechazar
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(deposit.id, deposit.userId, deposit.amount)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-2 h-4 w-4" />Aprobar
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>Lista de todos los usuarios registrados en la plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Saldo USDT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && users.length === 0 ? (
                     <>
                        <TableRow key="skeleton-row-1"><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        <TableRow key="skeleton-row-2"><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                     </>
                  ) : users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-right">{formatCurrency(user.saldoUSDT)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
