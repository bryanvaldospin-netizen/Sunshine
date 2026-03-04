'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, DepositRequest } from '@/types';
import { approveDeposit, rejectDeposit } from '@/lib/actions';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const DepositsTab = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'deposit_requests'), where('status', '==', 'Pendiente'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requestList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));
      setRequests(requestList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching deposit requests: ", error);
      setLoading(false);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las solicitudes.' });
    });
    return () => unsubscribe();
  }, [toast]);

  const handleApprove = async (reqId: string, userId: string, amount: number) => {
    const result = await approveDeposit({ requestId: reqId, userId, amount });
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Depósito aprobado.' });
    }
  };

  const handleReject = async (reqId: string) => {
    const result = await rejectDeposit({ requestId: reqId });
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Depósito rechazado.' });
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-gray-400">Cargando solicitudes...</div>;
  }

  return (
    <Card className="bg-gray-900 border-gray-700 text-white">
      <CardHeader><CardTitle>Solicitudes Pendientes</CardTitle></CardHeader>
      <CardContent>
        {requests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Usuario</TableHead>
                <TableHead className="text-gray-300">Monto</TableHead>
                <TableHead className="text-gray-300">Fecha</TableHead>
                <TableHead className="text-right text-gray-300">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => (
                <TableRow key={req.id} className="border-gray-800">
                  <TableCell>{req.userName}</TableCell>
                  <TableCell className="font-mono text-golden">${req.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(req.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button asChild variant="outline" size="sm" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400">
                      <Link href={req.comprobanteURL} target="_blank" rel="noopener noreferrer">Ver Comprobante</Link>
                    </Button>
                    <Button variant="outline" size="sm" className="border-golden text-golden hover:bg-golden/10 hover:text-golden" onClick={() => handleApprove(req.id, req.userId, req.amount)}>Aprobar</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleReject(req.id)}>Rechazar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-gray-500 py-8">No hay solicitudes de depósito pendientes.</p>
        )}
      </CardContent>
    </Card>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const userList = userSnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(userList);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="text-center p-8 text-gray-400">Cargando usuarios...</div>;
  }
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);


  return (
    <Card className="bg-gray-900 border-gray-700 text-white">
      <CardHeader><CardTitle>Gestión de Usuarios</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-300">Nombre</TableHead>
              <TableHead className="text-gray-300">Email</TableHead>
              <TableHead className="text-gray-300">Rol</TableHead>
              <TableHead className="text-right text-gray-300">Saldo USDT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.uid} className="border-gray-800">
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Badge variant={user.rol === 'admin' ? 'destructive' : 'secondary'}>{user.rol}</Badge></TableCell>
                <TableCell className="text-right font-mono text-golden">{formatCurrency(user.saldoUSDT)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


export default function AdminTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-golden to-red-700">
          Panel de Control - Administrador Sunshine
        </h1>
        <Tabs defaultValue="deposits" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="deposits" className="data-[state=active]:bg-gray-700 data-[state=active]:text-golden">Solicitudes de Depósito</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gray-700 data-[state=active]:text-golden">Gestión de Usuarios</TabsTrigger>
          </TabsList>
          <TabsContent value="deposits" className="mt-6">
            <DepositsTab />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
