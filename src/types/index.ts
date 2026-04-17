
export type InvestmentData = {
  amount: number;
  startDate: string; // ISO string
  dailyRate: number;
  earningsGenerated: number;
  status: 'active' | 'completed';
  bonusPaid: boolean;
  lastUpdated?: string; // ISO string
};

export type Investment = InvestmentData & {
  id: string;
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
  tickets?: number;
  lastTicketClaim?: string; // ISO string
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

export type MinesGame = {
  id: string;
  userId: string;
  createdAt: string; // ISO string
  status: 'active' | 'busted' | 'cashed_out';
  numMines: number;
  wagerAmount: number; // Number of tickets
  revealedSquares: number[];
  mineLocations: number[]; // Not sent to client
  multiplier: number;
  winnings?: number;
};

export type CrashGame = {
  id: string;
  userId: string;
  createdAt: string; // ISO string
  status: 'active' | 'crashed' | 'cashed_out';
  betAmount: number; // USDT
  crashPoint: number;
  cashOutMultiplier?: number;
  winnings?: number;
};

export type BalloonGame = {
  id: string;
  userId: string;
  createdAt: string; // ISO string
  status: 'active' | 'burst' | 'cashed_out';
  betAmount: number; // USDT
  burstPoint: number;
  cashOutMultiplier?: number;
  winnings?: number;
};

export type BingoGame = {
  id: string;
  userId: string;
  createdAt: string; // ISO string
  status: 'active' | 'line_won' | 'bingo_won';
  card: (number | null)[];
  winnings?: number;
  winType?: 'line' | 'bingo';
};

export type Match = {
  id: string;
  sport: 'Fútbol' | 'Basketball';
  league: string;
  teamA: { name: string; logo: string; };
  teamB: { name: string; logo: string; };
  time: string;
  odds: {
    teamA: number;
    draw?: number;
    teamB: number;
  };
};

export type Bet = {
  id: string;
  userId: string;
  matchId: string;
  sport: 'Fútbol' | 'Basketball';
  matchDescription: string;
  betOn: string;
  odds: number;
  amount: number;
  potentialWinnings: number;
  status: 'pendiente' | 'ganada' | 'perdida';
  createdAt: string; // ISO String
};
