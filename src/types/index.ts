export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  rol: 'user';
  saldoUSDT: number;
  retirosTotales?: number;
  invitadoPor?: string | null;
  inviteCode?: string;
  ultimoCheckIn?: string;
  walletAddress?: string;
  planActivo?: number;
  inversionAnterior: number;
  fechaInicioPlan?: string | null;
  bonoDirecto: number;
  bonoRetirable?: number;
  bonoEntregado: boolean | 'reclamado';
  fechaRegistro?: string;
  estadoPlan?: 'activo' | 'vencido';
  fechaVencimiento?: string | null;
};

export type DepositRequest = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string; // ISO string
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  comprobanteURL: string;
  planName: string;
};

export type InvitationCode = {
  id: string;
  used: boolean;
  usedBy: string | null;
};

export type Transaction = {
  fecha: string; // ISO string
  tipo: string;
  descripcion: string;
  monto: number;
};
