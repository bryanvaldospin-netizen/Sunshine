'use client';
import { Logo } from './logo';
import { UserNav } from './user-nav';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <Logo />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
