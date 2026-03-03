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
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, introduce un email válido.' }),
  password: z.string().min(1, { message: 'La contraseña es obligatoria.' }),
});

export default function AdminAccessPage() {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await loginAdmin(values);
    if (result?.error) {
      toast({
        variant: 'destructive',
        title: 'Acceso Denegado',
        description: result.error,
      });
    }
  }

  return (
    <Card className="bg-gray-900 border-golden text-white">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-golden to-yellow-300">
          Acceso de Administrador
        </CardTitle>
        <CardDescription className="text-gray-400">Ingresa tus credenciales de administrador.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="admin@sunshine.com" 
                      {...field} 
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                    />
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
                  <FormLabel className="text-gray-300">Contraseña</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field} 
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-gradient-to-r from-golden to-red-800 text-white" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="underline text-gray-400 hover:text-golden">
            ¿No eres administrador? Ir al login de usuario.
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
