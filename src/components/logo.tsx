import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-foreground', className)}>
      <Image src="/logo.png" alt="Sunshine Logo" width={40} height={40} />
      <span className="text-xl font-bold font-headline tracking-tight">Sunshine</span>
    </div>
  );
}
