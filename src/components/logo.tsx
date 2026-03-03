import { Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-foreground', className)}>
      <div className="bg-gradient-to-r from-golden to-red-800 p-2 rounded-md">
        <Sun className="h-6 w-6 text-white" />
      </div>
      <span className="text-xl font-bold font-headline tracking-tight">Sunshine</span>
    </div>
  );
}
