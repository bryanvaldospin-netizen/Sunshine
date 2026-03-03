import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-foreground', className)}>
      <Image
        src="https://placehold.co/48x48/D4AF37/FFFFFF?text=S"
        alt="Sunshine Logo"
        width={48}
        height={48}
        className="object-contain rounded-full"
      />
      <span className="text-xl font-bold font-headline tracking-tight">Sunshine</span>
    </div>
  );
}
