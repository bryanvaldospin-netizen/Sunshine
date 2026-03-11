'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Share } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();

  const isIos = () => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isInStandaloneMode = () => {
    if (typeof window === 'undefined') return false;
    return ('standalone' in window.navigator) && (window.navigator as any).standalone;
  }

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const seenPrompt = sessionStorage.getItem('hasSeenInstallPrompt');
      if (!seenPrompt && !isInStandaloneMode()) {
        setInstallPrompt(e);
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Logic for iOS
    if (isIos() && !isInStandaloneMode()) {
        const seenPrompt = sessionStorage.getItem('hasSeenInstallPrompt');
        if (!seenPrompt) {
            setIsVisible(true);
        }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
      setIsVisible(false);
      sessionStorage.setItem('hasSeenInstallPrompt', 'true');
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('hasSeenInstallPrompt', 'true');
  };
  
  if (!isMobile || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm">
        <Card className="bg-gray-800 border-golden text-white shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <CardHeader>
                <CardTitle>Instala Sunshine App</CardTitle>
                <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white">
                    <X size={18} />
                </button>
            </CardHeader>
            <CardContent>
                {isIos() ? (
                    <div>
                        <p className="text-sm mb-4">
                            Para instalar, presiona el ícono de <Share size={16} className="inline-block mx-1" /> 'Compartir' y luego 'Añadir a la pantalla de inicio'.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm mb-4">
                            Añade Sunshine a tu pantalla de inicio para un acceso rápido y una mejor experiencia.
                        </p>
                        <Button className="w-full bg-gradient-to-r from-golden to-red-800 text-white" onClick={handleInstallClick}>
                            Instalar App
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
