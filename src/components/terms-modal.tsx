'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';

export function TermsAndConditionsModal({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-golden to-red-800 text-primary-foreground rounded-t-lg">
          <DialogTitle className="text-white text-2xl">
            Términos y Condiciones de Inversión de Sunshine
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Lea atentamente antes de continuar.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] p-6">
          <div className="space-y-4 text-sm text-muted-foreground">
            <h3 className="font-bold text-foreground">1. Objeto</h3>
            <p>
              Los presentes Términos y Condiciones regulan la relación entre el usuario inversor
              (en adelante, "el Usuario") y Sunshine (en adelante, "la Plataforma") para la
              realización de depósitos de inversión en USDT (Tether) a través de la red TRC-20.
            </p>

            <h3 className="font-bold text-foreground">2. Proceso de Depósito</h3>
            <p>
              <strong>2.1. Solicitud:</strong> El Usuario deberá iniciar una solicitud de depósito a través de la
              sección 'Depósito de Inversión', especificando el monto en USDT que desea invertir.
            </p>
            <p>
              <strong>2.2. Transferencia:</strong> El Usuario es el único responsable de realizar la transferencia del
              monto exacto de USDT a la dirección de billetera TRC-20 proporcionada por la
              Plataforma. Errores en la dirección o la red de transferencia son de exclusiva
              responsabilidad del Usuario.
            </p>
            <p>
              <strong>2.3. Comprobante:</strong> Es obligatorio que el Usuario suba un comprobante de
              transferencia claro y legible (captura de pantalla o hash de la transacción). La
              Plataforma se reserva el derecho de rechazar la solicitud si el comprobante no es
              válido o es ininteligible.
            </p>

            <h3 className="font-bold text-foreground">3. Verificación y Aprobación</h3>
            <p>
              <strong>3.1. Plazos:</strong> La Plataforma se compromete a revisar las solicitudes de depósito en un
              plazo de 24 a 48 horas hábiles desde la recepción del comprobante.
            </p>
            <p>
              <strong>3.2. Aprobación:</strong> Una vez verificado el depósito en la blockchain, la solicitud será
              marcada como 'Aprobado' y el saldo correspondiente se acreditará en la cuenta del
              Usuario dentro de la Plataforma.
            </p>
            <p>
              <strong>3.3. Rechazo:</strong> La Plataforma puede rechazar una solicitud por los siguientes motivos:
              comprobante inválido, monto no coincidente, problemas técnicos, o sospecha de
              actividad fraudulenta. En caso de rechazo, el Usuario será notificado.
            </p>

            <h3 className="font-bold text-foreground">4. Política de Retiro</h3>
            <p>
              La política de retiros, incluyendo plazos, comisiones y condiciones, se rige por un
              documento separado y debe ser consultada por el Usuario antes de solicitar un retiro
              de fondos.
            </p>

            <h3 className="font-bold text-foreground">5. Responsabilidad del Usuario</h3>
            <p>
              El Usuario declara ser el titular legítimo de los fondos invertidos y asume todos los
              riesgos asociados a la inversión en criptoactivos. Sunshine no se hace responsable
              de la volatilidad del mercado ni de las pérdidas de capital.
            </p>
            <p>
              Al hacer clic en "Acepto", el Usuario confirma que ha leído, entendido y aceptado
              la totalidad de estos Términos y Condiciones.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
