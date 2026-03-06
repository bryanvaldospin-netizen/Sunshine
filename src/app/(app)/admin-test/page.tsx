'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-collection';
import { collection, query, orderBy, where, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, DepositRequest } from '@/types';
import {
  approveDeposit,
  rejectDeposit,
  updateUserBalance,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const EditBalanceDialog = ({
  user,
  onSuccess,
}: {
  user: UserProfile;
  onSuccess: () => void;
}) => {
  const [newBalance, setNewBalance] = useState(user.saldoUSDT.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const balanceValue = parseFloat(newBalance);

    if (isNaN(balanceValue)) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Por favor, introduce un número válido para el saldo.',
      });
      setIsSubmitting(false);
      return;
    }

    const result = await updateUserBalance(user.uid, balanceValue);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: result.error,
      });
    } else {
      toast({
        title: 'Éxito',
        description: `Saldo de ${user.name} actualizado correctamente.`,
      });
      onSuccess();
      setOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar Saldo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Saldo de {user.name}</DialogTitle>
          <DialogDescription>
            Ajusta el saldo USDT del usuario. Este cambio se reflejará
            inmediatamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Nuevo Saldo USDT</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-golden to-red-800 text-white"
            >
              {isSubmitting ? 'Actualizando...' : 'Actualizar Saldo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UsersTab = () => {
  const { data: users, isLoading } = useCollection<UserProfile>(
    query(collection(db, 'users'), orderBy('name', 'asc'))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>
          Visualiza y gestiona todos los usuarios registrados en la plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Saldo USDT</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-8 w-24 mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            )}
            {users?.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-right font-mono">
                  ${user.saldoUSDT.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <EditBalanceDialog user={user} onSuccess={() => {}} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const DepositsTab = () => {
  const { data: deposits, isLoading } = useCollection<DepositRequest>(
    query(
      collectionGroup(db, 'deposit_requests'),
      orderBy('date', 'desc')
    )
  );
  const { toast } = useToast();

  const handleApprove = async (deposit: DepositRequest) => {
    const result = await approveDeposit(
      deposit.id,
      deposit.userId,
      deposit.amount
    );
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Depósito aprobado y saldo actualizado.' });
    }
  };

  const handleReject = async (depositId: string) => {
    const result = await rejectDeposit(depositId);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Depósito rechazado.' });
    }
  };
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Aprobado':
        return 'default';
      case 'Rechazado':
        return 'destructive';
      case 'Pendiente':
      default:
        return 'secondary';
    }
  };

  const pendingDeposits = deposits?.filter(d => d.status === 'Pendiente') || [];
  const processedDeposits = deposits?.filter(d => d.status !== 'Pendiente') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitudes de Depósito</CardTitle>
        <CardDescription>
          Revisa, aprueba o rechaza las solicitudes de depósito de los usuarios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Comprobante</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            
            {deposits?.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No hay solicitudes de depósito.</TableCell>
                </TableRow>
            )}

            {[...pendingDeposits, ...processedDeposits].map((deposit) => (
              <TableRow key={deposit.id}>
                <TableCell className="font-medium">{deposit.userName}</TableCell>
                <TableCell>{deposit.planName}</TableCell>
                <TableCell className="text-right font-mono">${deposit.amount.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                    <Badge variant={getStatusVariant(deposit.status)}>{deposit.status}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="link" asChild>
                    <a href={deposit.comprobanteURL} target="_blank" rel="noopener noreferrer">
                      Ver
                    </a>
                  </Button>
                </TableCell>
                <TableCell className="text-center space-x-2">
                  {deposit.status === 'Pendiente' && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(deposit)}>
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(deposit.id)}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


export default function AdminTestPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/test-page');
    }
  }, [isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Verificando permisos...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Panel de Administrador</h1>
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="deposits">Solicitudes de Depósito</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="deposits">
          <DepositsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
