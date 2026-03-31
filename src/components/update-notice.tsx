'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export function UpdateNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const noticeSeen = sessionStorage.getItem('sunshineUpdateNoticeV2Seen');
    if (!noticeSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    sessionStorage.setItem('sunshineUpdateNoticeV2Seen', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-gray-900 border-2 border-golden text-white sm:max-w-md shadow-2xl shadow-golden/20"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center items-center mb-4">
            <Rocket className="h-12 w-12 text-golden" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            🚀 AVISO DE CAMBIOS DE LA ACTUALIZACIÓN
          </DialogTitle>
        </DialogHeader>
        <div className="text-gray-300 space-y-4 text-sm px-2">
            <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-white">Planes VIP BOOST para todos:</strong> Se eliminaron los planes básicos. Ahora todos los planes son VIP (2.0% - 2.8%).</li>
                <li><strong className="text-white">Limpieza de base de datos:</strong> Se eliminaron cuentas sin inversión por más de 10 días. Si tu cuenta fue eliminada, por favor regístrate de nuevo.</li>
                <li><strong className="text-white">Multi-inversiones Habilitadas:</strong> Ya no estás limitado a una sola inversión. Ahora puedes tener varios planes activos simultáneamente, activándolos desde tu saldo de billetera (Wallet Balance).</li>
            </ul>
            <p className="text-xs text-center text-muted-foreground pt-2">
                Versión 2.0 Estable. Para más información, contactar a soporte.
            </p>
        </div>
        <DialogFooter className="flex-col items-center pt-4">
            <p className="text-center text-base font-semibold text-golden mb-4">En Sunshine queremos lo mejor para ti.</p>
            <Button type="button" onClick={handleClose} className="w-full bg-golden text-black hover:bg-amber-400">
                Entendido
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
