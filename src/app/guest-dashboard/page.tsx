'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function GuestDashboardPage() {
  const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <Card className="text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-normal text-muted-foreground">Saldo de Demostración</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-5xl font-bold text-golden">{formattedBalance}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Empieza a Invertir</CardTitle>
            <CardDescription>Crea una cuenta para realizar tu primer depósito y ver crecer tus ganancias.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 pt-8">
             <p className="text-center text-muted-foreground">El modo invitado es solo para exploración. <br/> Para invertir, necesitas una cuenta.</p>
            <Link href="/register" className="w-full">
                <Button className="w-full bg-gradient-to-r from-golden to-red-800 text-white text-lg py-6">
                    Crear Cuenta Ahora
                </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Historial de Solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                    Regístrate para ver tu historial de inversiones.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
