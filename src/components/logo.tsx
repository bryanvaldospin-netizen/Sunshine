import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-foreground', className)}>
      <Image
        src="https://storage.googleapis.com/studio-images/q/v/qc/user/29be7a44-a035-4309-bbd9-35c8e967a1da/2dd2834b-4f9e-4b7d-b286-dd87f9d850a5.png"
        alt="Sunshine Logo"
        width={48}
        height={48}
        className="object-contain"
      />
      <span className="text-xl font-bold font-headline tracking-tight">Sunshine</span>
    </div>
  );
}
