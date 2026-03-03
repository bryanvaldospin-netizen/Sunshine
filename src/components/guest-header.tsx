import { Logo } from './logo';
import Link from 'next/link';
import { Button } from './ui/button';

export function GuestHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center space-x-2">
          <Link href="/login">
            <Button variant="ghost">Iniciar Sesión</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-gradient-to-r from-golden to-red-800 text-white">Registrarse</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
