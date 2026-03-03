import Image from 'next/image';

export default function SplashScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="animate-fade-in animate-duration-1000 flex flex-col items-center">
          <Image
            src="https://storage.googleapis.com/studio-images/q/v/qc/user/29be7a44-a035-4309-bbd9-35c8e967a1da/57a7905a-2115-46f5-83e8-283b8bd16503.png"
            alt="Sunshine Logo"
            width={128}
            height={128}
            className="object-contain mb-4"
          />
         <span className="text-2xl font-bold font-headline tracking-tight text-white">Sunshine</span>
      </div>
      <div className="absolute bottom-20 flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-golden border-t-transparent" />
        <p className="text-sm text-gray-400">Cargando tu camino al sol...</p>
      </div>
    </div>
  );
}
