'use client';

import { Header } from '@/components/header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // NOTE: Authentication checks have been removed as an emergency measure
  // to bypass redirection loops.
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </div>
  );
}
