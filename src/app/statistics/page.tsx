'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserStats } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Users, UserX, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StatisticsPage() {
  const [stats, setStats] = useState<{ totalUsers: number; inactiveCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getUserStats();
        if (result && 'error' in result) {
          toast({
            variant: 'destructive',
            title: 'Error al cargar estadísticas',
            description: result.error,
          });
          setStats(null);
        } else if (result) {
          setStats(result as { totalUsers: number; inactiveCount: number });
        }
      } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error inesperado',
            description: 'No se pudieron obtener las estadísticas.',
          });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4 text-white">
      <Card className="w-full max-w-2xl shadow-lg bg-gray-800 border-gray-700 text-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Estadísticas de Usuarios</CardTitle>
          <Link href="/login">
            <Button variant="outline" className="border-golden text-golden hover:bg-golden/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 bg-gray-700 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-48 bg-gray-700" />
                    <Skeleton className="h-8 w-24 bg-gray-700" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 bg-gray-700 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-64 bg-gray-700" />
                    <Skeleton className="h-8 w-24 bg-gray-700" />
                </div>
              </div>
            </div>
          ) : stats ? (
            <>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuarios Registrados</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <UserX className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuarios inactivos (+10 días sin plan)</p>
                  <p className="text-3xl font-bold">{stats.inactiveCount}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">No se pudieron cargar las estadísticas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
