import { Logo } from './logo';

export default function SplashScreen() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="animate-fade-in animate-duration-1000">
        <Logo className="text-white" />
      </div>
      <div className="absolute bottom-20 flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-golden border-t-transparent" />
        <p className="text-sm text-gray-400">Cargando tu camino al sol...</p>
      </div>
    </div>
  );
}
