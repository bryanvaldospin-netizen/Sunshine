import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-foreground', className)}>
      <span className="text-xl font-bold font-headline tracking-tight">Sunshine</span>
    </div>
  );
}
