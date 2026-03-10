'use client';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, LogOut, Copy, User as UserIcon, ArrowLeft } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { syncInviteCodes } from '@/lib/actions';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const handleSync = async () => {
    toast({ title: "Sincronizando...", description: "Migrando códigos de invitación de usuarios existentes. Por favor espera." });
    const result = await syncInviteCodes();
    if (result.error) {
        toast({ variant: 'destructive', title: "Error de Sincronización", description: result.error });
    } else if (result.success) {
        toast({ title: "Sincronización Completa", description: result.message });
    }
  };
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  const supportEmail = 'bryan_valdospin@hotmail.com';
  const supportSubject = 'Soporte Sunshine - Ayuda con mi cuenta';

  if (authLoading) {
    return (
        <div className="container mx-auto p-4 md:p-8 flex justify-center">
            <Card className="w-full max-w-2xl shadow-lg bg-gray-800/50">
                <CardHeader>
                    <Skeleton className="h-8 w-32 bg-gray-700" />
                    <Skeleton className="h-4 w-48 bg-gray-700" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full bg-gray-700" />
                </CardContent>
            </Card>
        </div>
    )
  }

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
      <Card className="w-full max-w-2xl shadow-lg bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <div className="flex justify-between items-center mb-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2"><UserIcon /> {t('profile.title')}</CardTitle>
            <Link href="/test-page">
                <Button variant="outline" className="border-golden text-golden hover:bg-golden/10">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Panel
                </Button>
            </Link>
          </div>
          <CardDescription className="text-gray-400">Gestiona la información de tu cuenta y tus preferencias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            
          <div className="space-y-3 pt-4">
              <ul className="space-y-3 text-sm list-none">
                  <li><strong className="text-gray-400 font-medium w-40 inline-block">Nombre:</strong> {user.name}</li>
                  <li><strong className="text-gray-400 font-medium w-40 inline-block">Correo:</strong> {user.email}</li>
                  <li className="flex items-center">
                      <strong className="text-gray-400 font-medium w-40 inline-block flex-shrink-0">Billetera de Retiro (TRC-20):</strong>
                      {user.walletAddress ? (
                          <div className="flex items-center min-w-0 flex-1">
                              <span className="font-mono text-white truncate" title={user.walletAddress}>{user.walletAddress}</span>
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                      if (user.walletAddress) {
                                          navigator.clipboard.writeText(user.walletAddress);
                                          toast({ title: 'Billetera copiada', description: 'La dirección de tu billetera ha sido copiada al portapapeles.' });
                                      }
                                  }}
                                  className="h-7 w-7 ml-2 text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0"
                              >
                                  <Copy className="h-4 w-4" />
                              </Button>
                          </div>
                      ) : (
                          <span className="text-gray-500">N/A</span>
                      )}
                  </li>
                  <li className="flex items-center">
                      <strong className="text-gray-400 font-medium w-40 inline-block flex-shrink-0">Código Invitación:</strong>
                      {user.inviteCode ? (
                          <>
                              <span className="font-mono text-golden">{user.inviteCode}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (!user.inviteCode) return;
                                  navigator.clipboard.writeText(user.inviteCode);
                                  toast({ title: t('profile.codeCopied'), description: t('profile.codeCopiedDesc') });
                                }}
                                className="h-7 w-7 ml-2 text-gray-400 hover:text-golden hover:bg-gray-700"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                          </>
                      ) : (
                          <span className="text-gray-500">N/A</span>
                      )}
                  </li>
                  <li><strong className="text-gray-400 font-medium w-40 inline-block">Saldo Actual:</strong> {formatCurrency(user.saldoUSDT)}</li>
                  <li className="flex items-start">
                      <strong className="text-gray-400 font-medium w-40 inline-block flex-shrink-0">UID:</strong>
                      <span className="break-all">{user.uid}</span>
                  </li>
              </ul>
              <div className="border-t border-gray-700 my-4"></div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">{t('profile.language')}</Label>
            <Select value={locale} onValueChange={(value) => setLocale(value as 'es' | 'en')}>
              <SelectTrigger id="language" className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Seleccionar idioma" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="es" className="cursor-pointer focus:bg-gray-700">Español</SelectItem>
                <SelectItem value="en" className="cursor-pointer focus:bg-gray-700">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

           <div className="border-t border-gray-700 mt-4 pt-4">
              <Button onClick={handleSync} variant="outline" className="w-full border-amber-600 text-amber-600 hover:bg-amber-600/10 hover:text-amber-500">
                  Sincronizar Códigos Antiguos
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                  Usa este botón una sola vez para migrar los códigos de invitación de usuarios existentes al nuevo sistema.
              </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}`} className="w-full">
              <Button variant="outline" className="w-full border-golden text-golden hover:bg-golden/10">
                <Mail className="mr-2 h-4 w-4" />
                {t('profile.support')}
              </Button>
            </a>
            <Button onClick={handleLogout} className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white">
              <LogOut className="mr-2 h-4 w-4" />
              {t('profile.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
