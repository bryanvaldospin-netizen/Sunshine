import type { Match } from '@/types';

export const mockMatches: Match[] = [
  // Fútbol
  {
    id: 'F1',
    sport: 'Fútbol',
    league: 'La Liga',
    teamA: { name: 'Real Madrid', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/Th4fAVAZeCJWRcKoLW7koA_96x96.png' },
    teamB: { name: 'FC Barcelona', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/paYnEE8hcrP96neHRNofhQ_96x96.png' },
    time: '21:00',
    odds: { teamA: 2.1, draw: 3.5, teamB: 3.2 },
  },
  {
    id: 'F2',
    sport: 'Fútbol',
    league: 'Premier League',
    teamA: { name: 'Man City', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/z44l-a0W1v5FmgP1Lhd2xg_96x96.png' },
    teamB: { name: 'Liverpool', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/0iShHhASp5q1SL4JhtwJiw_96x96.png' },
    time: '17:30',
    odds: { teamA: 1.8, draw: 4.0, teamB: 4.5 },
  },
  // Basketball
  {
    id: 'B1',
    sport: 'Basketball',
    league: 'NBA',
    teamA: { name: 'Lakers', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/show_L4_IuCjDQ4I2tD-7I4Q_96x96.png' },
    teamB: { name: 'Celtics', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/GDJBo7eEFx8at03iXZQCHg_96x96.png' },
    time: '20:00',
    odds: { teamA: 1.9, teamB: 1.9 },
  },
  {
    id: 'B2',
    sport: 'Basketball',
    league: 'NBA',
    teamA: { name: 'Warriors', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/pD7V6qb6nRA92J7T4Ewg9g_96x96.png' },
    teamB: { name: 'Nets', logo: 'https://ssl.gstatic.com/onebox/media/sports/logos/iishUmO7vbTR2tT-3T_8cA_96x96.png' },
    time: '22:30',
    odds: { teamA: 1.6, teamB: 2.3 },
  },
];
