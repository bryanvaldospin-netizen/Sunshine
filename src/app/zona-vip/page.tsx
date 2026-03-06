'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function ZonaVipPage() {
  const [uid, setUid] = useState('');
  const [clave, setClave] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const handleLogin = () => {
    if (uid === 'daNNsN4y5lgsTtrioMXNXcX24ZH2' && clave === '0986051804') {
      setIsAuthenticated(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Acceso Denegado',
        description: 'UID o Clave incorrectos.',
      });
    }
  };

  if (isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
        <h1 className="text-5xl font-bold">Bienvenido Jefe Brayan</h1>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900">
      <Card className="w-full max-w-md bg-gray-800 border-golden text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-golden">Acceso Maestro</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Ingresa las credenciales de administrador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uid-admin">UID Admin</Label>
            <Input
              id="uid-admin"
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className="bg-gray-700 border-gray-600 focus:ring-golden"
              placeholder="daNNsN4y5lgsTtrioMXNXcX24ZH2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clave">Clave</Label>
            <Input
              id="clave"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              className="bg-gray-700 border-gray-600 focus:ring-golden"
              placeholder="••••••••"
            />
          </div>
          <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-golden to-red-800 text-white">
            Validar y Entrar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
