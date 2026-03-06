'use client';
import { Logo } from './logo';
import { UserNav } from './user-nav';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from './ui/button';
import { Cog } from 'lucide-react';

export function Header() {
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <Logo />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {isAdmin && (
              <Link href="/admin-test">
                <Button variant="ghost" size="sm">
                  <Cog className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
