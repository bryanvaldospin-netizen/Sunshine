'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserStats } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Users, UserX } from 'lucide-react';

export default function UserStatsPage() {
  const [stats, setStats] = useState<{ totalUsers: number; inactiveCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getUserStats();
        if ('error' in result) {
          toast({
            variant: 'destructive',
            title: 'Error al cargar estadísticas',
            description: result.error,
          });
          setStats(null);
        } else {
          setStats(result);
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
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
      <Card className="w-full max-w-2xl shadow-lg bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Estadísticas de Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
