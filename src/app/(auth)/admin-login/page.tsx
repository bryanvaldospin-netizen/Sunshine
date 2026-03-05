'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { loginAdmin } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  password: z.string().min(1, { message: 'La contraseña es obligatoria.' }),
});

export default function AdminLoginPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'yareelvaldospin@gmail.com',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await loginAdmin(values);
    if (result?.error) {
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión de administrador',
        description: result.error,
      });
    } else if (result?.success) {
      toast({
        title: '¡Login de Admin exitoso!',
        description: 'Redirigiendo al panel...',
      });
      // The AuthLayout will handle the redirection to /admin-test
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-800">
          Admin Login
        </CardTitle>
        <CardDescription>Acceso exclusivo para administradores.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Administrador</FormLabel>
                  <FormControl>
                    <Input placeholder="admin@sunshine.com" {...field} />
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
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Verificando...' : 'Entrar como Admin'}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="underline text-accent">
            ¿No eres admin? Volver al login de usuario.
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
