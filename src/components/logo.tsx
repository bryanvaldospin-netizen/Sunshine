import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-foreground', className)}>
      <div className="relative h-16 w-16">
        <Image
          src="/logo.png"
          alt="Sunshine Logo"
          fill
          className="object-contain"
        />
      </div>
      <span className="text-xl font-bold font-headline tracking-tight">Sunshine</span>
    </div>
  );
}
