'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';

export function MaintenanceModal() {
  // This state controls the visibility. Set to `false` in the code to disable the modal.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // This logic prevents the dialog from being closed by the 'Esc' key or the default 'X' button
        if (!open) {
          return;
        }
        setIsOpen(open);
    }}>
      <DialogContent 
        className="bg-gray-900 border-2 border-golden text-white sm:max-w-md shadow-2xl shadow-golden/20" 
        onInteractOutside={(e) => {
          // This prevents the dialog from closing when clicking outside of it
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex justify-center items-center mb-4">
            <Wrench className="h-12 w-12 text-golden" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            🛠️ Mantenimiento en Progreso
          </DialogTitle>
          <DialogDescription className="text-center text-gray-300 pt-2">
            Estamos actualizando nuestros sistemas para ofrecerte la mejor experiencia con los nuevos Planes VIP (2% al 2.8%).
            <br /><br />
            <strong className="text-white">Tiempo estimado de finalización:</strong> 4 horas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-4">
          <Button type="button" className="bg-golden text-black hover:bg-amber-400">
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
