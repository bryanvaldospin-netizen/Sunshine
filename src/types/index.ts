export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  rol: 'user' | 'admin';
  saldoUSDT: number;
  invitationCode: string;
};

export type DepositRequest = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string; // ISO string
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  comprobanteURL: string;
};

export type InvitationCode = {
  id: string;
  used: boolean;
  usedBy: string | null;
};
