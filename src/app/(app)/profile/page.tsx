'use client';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const supportEmail = 'bryan_valdospin@hotmail.com';
  const supportSubject = 'Soporte Sunshine - Ayuda con mi cuenta';

  return (
    <div className="container mx-auto p-4 md:p-8 flex justify-center">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t('profile.title')}</CardTitle>
          <CardDescription>Gestiona la información de tu cuenta y tus preferencias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 p-4 border rounded-lg">
            <Label>{t('profile.name')}</Label>
            <p className="font-semibold text-lg text-golden">{user.name}</p>
          </div>
          <div className="space-y-2 p-4 border rounded-lg">
            <Label>{t('profile.email')}</Label>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <div className="space-y-2 p-4 border rounded-lg">
            <Label>{t('profile.role')}</Label>
            <p className="text-muted-foreground capitalize">{user.rol}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language">{t('profile.language')}</Label>
            <Select value={locale} onValueChange={(value) => setLocale(value as 'es' | 'en')}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Seleccionar idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}`} className="w-full">
              <Button variant="outline" className="w-full">
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
