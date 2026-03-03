'use client';

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
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
  codigoInvitacion: z.string().optional(),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos y condiciones.' }),
  }),
});

export default function RegisterPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      codigoInvitacion: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await registerUser(values);
    if (result?.error) {
      toast({
        variant: 'destructive',
        title: 'Error de registro',
        description: result.error,
      });
    } else if (result?.success) {
      toast({
        title: '¡Registro exitoso!',
        description: 'Redirigiendo...',
      });
      router.push('/dashboard');
    }
  }

  return (
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
              name="codigoInvitacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.invitationCode')}</FormLabel>
                  <FormControl>
                    <Input placeholder="CODE123" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    (Opcional - Úsalo si tienes un referido)
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
  );
}
