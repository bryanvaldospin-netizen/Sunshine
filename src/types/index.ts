export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  rol: 'user';
  saldoUSDT: number;
  invitadoPor?: string | null;
  inviteCode?: string;
  ultimoCheckIn?: string;
  walletAddress?: string;
  planActivo?: number;
  fechaInicioPlan?: string | null;
  bonoDirecto?: number;
  fechaRegistro?: string;
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

export type Investment = {
  id: string;
  userId: string;
  planName: string;
  startDate: string; // ISO string
  nextPaymentDate: string; // ISO string
  status: 'Activo' | 'Completado';
};
