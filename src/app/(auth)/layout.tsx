'use client';

import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: Authentication checks have been removed as an emergency measure
  // to bypass redirection loops.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-8 left-8">
        <Logo />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </main>
  );
}
