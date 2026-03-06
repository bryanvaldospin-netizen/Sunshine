'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import SplashScreen from '@/components/splash-screen';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/types';
import { useCollection, useMemoFirebase } from '@/firebase';
import { db } from '@/lib/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';

function EditBalanceDialog({ user }: { user: UserProfile }) {
  const [open, setOpen] = useState(false);
  const [newBalance, setNewBalance] = useState(user.saldoUSDT.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    setIsSubmitting(true);
    const balanceValue = parseFloat(newBalance);
    if (isNaN(balanceValue) || balanceValue < 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Por favor, introduce un número positivo para el saldo.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        saldoUSDT: balanceValue,
      });
      toast({
        title: 'Éxito',
        description: `El saldo de ${user.name} ha sido actualizado.`,
      });
      setOpen(false);
    } catch (error: any) {
      console.error('Error updating balance:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `No se pudo actualizar el saldo. ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Saldo de {user.name}</DialogTitle>
          <DialogDescription>
            Actualiza el saldo USDT para este usuario. El cambio se reflejará inmediatamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-right">
              Saldo USDT
            </Label>
            <Input
              id="balance"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="col-span-3"
              type="number"
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

function UserManagementTable() {
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), []);
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-md border p-4">
        <Skeleton className="h-10 w-full bg-muted" />
        <Skeleton className="h-10 w-full bg-muted" />
        <Skeleton className="h-10 w-full bg-muted" />
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <p>No se encontraron usuarios.</p>;
  }
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);


  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Saldo USDT</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{formatCurrency(user.saldoUSDT)}</TableCell>
              <TableCell className="text-right">
                <EditBalanceDialog user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminTestPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/test-page');
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return <SplashScreen />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Gestión de Usuarios</CardTitle>
          <CardDescription>Administra los perfiles y saldos de los usuarios de la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
            <UserManagementTable />
        </CardContent>
      </Card>
    </div>
  );
}
