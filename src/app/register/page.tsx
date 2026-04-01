'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Logo } from '@/components/logo';
import SplashScreen from '@/components/splash-screen';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { registerUser } from '@/lib/actions';
import { TermsAndConditionsModal } from '@/components/terms-modal';
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

// Updated schema to remove user-created invite code
const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
  walletAddress: z.string().min(20, { message: 'Por favor, introduce una dirección de billetera USDT (BEP-20) válida.' }),
  sponsorCode: z.string().optional(),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos y condiciones.' }),
  }),
});

function RegisterPageContent() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      walletAddress: '',
      sponsorCode: '',
    },
  });

  // Effect to capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      form.setValue('sponsorCode', refCode);
    }
  }, [searchParams, form]);

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace('/dashboard');
    }
  }, [loading, firebaseUser, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await registerUser(values);
    
    if (result && 'error' in result) {
      console.error("Registration error details:", JSON.stringify(result, null, 2));
      toast({
        variant: 'destructive',
        title: 'Error de registro',
        description: result.error,
      });
    } else if (result && 'success' in result) {
      if (result.token) {
        try {
          await signInWithCustomToken(auth, result.token);
          toast({
            title: '¡Registro exitoso!',
            description: '¡Bienvenido! Tu cuenta ha sido creada. Redirigiendo...',
          });
          router.push('/dashboard');
        } catch (authError) {
          console.error("Sign in after registration failed:", authError);
          toast({
            variant: 'destructive',
            title: 'Error de inicio de sesión',
            description: 'Tu cuenta fue creada, pero no pudimos iniciar sesión. Por favor, intenta iniciar sesión manualmente.',
          });
          router.push('/login');
        }
      } else {
        // Handle case where registration is successful but token generation failed
        toast({
          title: '¡Registro casi completo!',
          description: result.message || 'Tu cuenta ha sido creada. Por favor, inicia sesión.',
        });
        router.push('/login');
      }
    }
  }

  if (loading || firebaseUser) {
    return <SplashScreen />;
  }

  return (
    <div className="w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-golden to-red-800">
            {t('auth.register')}
          </CardTitle>
          <CardDescription>Crea tu cuenta para empezar a invertir.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@sunshine.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walletAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billetera USDT (BEP-20)</FormLabel>
                    <FormControl>
                      <Input placeholder="Introduce tu dirección de billetera única" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Esta billetera se vinculará a tu cuenta y no podrá ser usada en otra.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sponsorCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Patrocinador (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Código de quien te invitó" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Si llegaste a través de un enlace de referido, este campo se llenará solo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        {t('auth.terms')}{' '}
                        <TermsAndConditionsModal>
                          <span className="text-accent hover:underline cursor-pointer">{t('auth.termsLink')}</span>
                        </TermsAndConditionsModal>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creando cuenta...' : t('auth.createAccount')}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            {t('auth.haveAccount')}{' '}
            <Link href="/login" className="underline text-accent">
              Inicia Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-8">
        <Logo />
      </div>
      <Suspense fallback={<SplashScreen />}>
        <RegisterPageContent />
      </Suspense>
    </main>
  );
}
