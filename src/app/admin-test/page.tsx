'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc, writeBatch } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { approveDeposit, rejectDeposit, updateUserBalance } from '@/lib/actions';
import type { UserProfile, DepositRequest } from '@/types';

type UserProfileWithId = UserProfile & { id: string };
type DepositRequestWithId = DepositRequest & { id: string };

function EditBalanceDialog({ user }: { user: UserProfileWithId }) {
  const [open, setOpen] = useState(false);
  const [newBalance, setNewBalance] = useState(user.saldoUSDT.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    setIsSubmitting(true);
    const balanceValue = parseFloat(newBalance);
    if (isNaN(balanceValue)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce un número válido.' });
      setIsSubmitting(false);
      return;
    }

    const result = await updateUserBalance(user.uid, balanceValue);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error al actualizar', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Saldo actualizado correctamente.' });
      setOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Editar Saldo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Editar Saldo de {user.name}</DialogTitle>
          <DialogDescription>
            Modifica el saldo USDT del usuario. Este cambio es permanente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-right">
              Saldo USDT
            </Label>
            <Input
              id="balance"
              type="number"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="col-span-3 bg-gray-700 border-gray-600"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTable() {
  const [users, setUsers] = useState<UserProfileWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserProfileWithId[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...(doc.data() as UserProfile) });
      });
      setUsers(usersData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <p>Cargando usuarios...</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Saldo USDT</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.uid}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(user.saldoUSDT)}</TableCell>
            <TableCell>
              <EditBalanceDialog user={user} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DepositsTable() {
  const [requests, setRequests] = useState<DepositRequestWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = collection(db, 'deposit_requests');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requestsData: DepositRequestWithId[] = [];
      querySnapshot.forEach((doc) => {
        requestsData.push({ id: doc.id, ...(doc.data() as DepositRequest) });
      });
      
      requestsData.sort((a, b) => {
        if (a.status === 'Pendiente' && b.status !== 'Pendiente') return -1;
        if (a.status !== 'Pendiente' && b.status === 'Pendiente') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setRequests(requestsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: DepositRequestWithId) => {
     const result = await approveDeposit(request.id, request.userId, request.amount);
     if (result.error) {
       toast({ variant: 'destructive', title: 'Error al aprobar', description: result.error });
     } else {
       toast({ title: 'Éxito', description: 'Depósito aprobado y saldo actualizado.' });
     }
  };

  const handleReject = async (requestId: string) => {
    const result = await rejectDeposit(requestId);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error al rechazar', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Depósito rechazado.' });
    }
  };


  if (loading) return <p>Cargando solicitudes...</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead>Monto (USDT)</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Comprobante</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => (
          <TableRow key={req.id}>
            <TableCell>{req.userName} <br/> <span className="text-xs text-gray-400">{req.date ? new Date(req.date).toLocaleString() : ''}</span></TableCell>
            <TableCell>{req.amount}</TableCell>
            <TableCell>{req.planName}</TableCell>
            <TableCell>
              <a href={req.comprobanteURL} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                Ver Imagen
              </a>
            </TableCell>
            <TableCell>{req.status}</TableCell>
            <TableCell className="space-x-2">
              {req.status === 'Pendiente' && (
                <>
                  <Button size="sm" onClick={() => handleApprove(req)}>Aprobar</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>Rechazar</Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}


export default function AdminTestPage() {
  return (
    <div className="bg-gray-900 text-white min-h-screen p-8">
       <header className="mb-8">
        <h1 className="text-4xl font-bold text-golden">Panel de Administrador</h1>
        <p className="text-gray-400">Gestiona usuarios y solicitudes de depósito de Sunshine.</p>
      </header>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="deposits">Solicitudes de Depósito</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Usuarios Registrados</CardTitle>
              <CardDescription>Visualiza y edita la información de los usuarios.</CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits">
           <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Solicitudes de Depósito</CardTitle>
              <CardDescription>Aprueba o rechaza las solicitudes de depósito pendientes.</CardDescription>
            </CardHeader>
            <CardContent>
              <DepositsTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
