
export type Investment = {
  id: string;
  amount: number;
  startDate: string; // ISO string
  dailyRate: number;
  earningsGenerated: number;
  status: 'active' | 'completed';
  bonusPaid: boolean;
  lastUpdated?: string; // ISO string
};

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  rol: 'user';
  saldoUSDT: number; // Wallet balance for new investments
  totalInvested: number; // Sum of all active investments
  retirosTotales?: number;
  invitadoPor?: string | null;
  inviteCode?: string;
  ultimoCheckIn?: string;
  walletAddress?: string;
  bonoDirecto: number;
  bonoRetirable?: number;
  hasUnclaimedBonuses?: boolean; // Flag for sponsor to claim direct bonus
  fechaRegistro?: string;
  lastConsolidation?: string;
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
  id?: string;
  fecha: string; // ISO string
  tipo: string;
  descripcion: string;
  monto: number;
};
