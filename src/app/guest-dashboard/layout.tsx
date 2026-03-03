import { GuestHeader } from '@/components/guest-header';

export default function GuestDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <GuestHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
