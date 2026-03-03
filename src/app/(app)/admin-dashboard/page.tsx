'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { collection, getDocs, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, DepositRequest } from '@/types';
import { approveDeposit, rejectDeposit } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { adminUserInsightSummary } from '@/ai/flows/admin-user-insight-summary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import SplashScreen from '@/components/splash-screen';


// Users Tab Component
const UsersTab = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const userList = userSnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(userList);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>{t('admin.users')}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.userName')}</TableHead>
              <TableHead>{t('admin.userEmail')}</TableHead>
              <TableHead>{t('admin.userRole')}</TableHead>
              <TableHead>{t('admin.userCode')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Cargando usuarios...</TableCell></TableRow>
            ) : users.map(user => (
              <TableRow key={user.uid}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Badge variant={user.rol === 'admin' ? 'default' : 'secondary'}>{user.rol}</Badge></TableCell>
                <TableCell>{user.invitationCode}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Deposits Tab Component
const DepositsTab = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'deposit_requests'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const requestList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));
      setRequests(requestList.filter(r => r.status === 'Pendiente'));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (reqId: string, userId: string, amount: number) => {
    const result = await approveDeposit({ requestId: reqId, userId, amount });
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Depósito aprobado.' });
    }
  };

  const handleReject = async (reqId: string) => {
    const result = await rejectDeposit({ requestId: reqId });
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Éxito', description: 'Depósito rechazado.' });
    }
  };
  
  if (loading) {
    return <div className="text-center p-8">Cargando solicitudes...</div>
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('admin.deposits')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {requests.length > 0 ? requests.map(req => (
          <div key={req.id} className="border p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{req.userName}</p>
              <p className="text-sm text-muted-foreground">{new Date(req.date).toLocaleString()}</p>
              <p className="text-lg font-bold text-golden">{req.amount} USDT</p>
            </div>
            <div className="flex items-center gap-2">
               <Link href={req.comprobanteURL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">{t('admin.viewProof')}</Button>
              </Link>
              <Button variant="outline" className="border-golden text-golden hover:bg-golden/10 hover:text-golden" onClick={() => handleApprove(req.id, req.userId, req.amount)}>{t('admin.approve')}</Button>
              <Button className="bg-gradient-to-r from-red-600 to-red-800 text-white" onClick={() => handleReject(req.id)}>{t('admin.reject')}</Button>
            </div>
          </div>
        )) : <p className="text-center text-muted-foreground">{t('admin.noRequests')}</p>}
      </CardContent>
    </Card>
  );
};

// AI Insights Tab Component
const AiInsightsTab = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      setUsers(userSnapshot.docs.map(doc => doc.data() as UserProfile));
    };
    fetchUsers();
  }, []);

  const handleGetInsight = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setInsight(null);
    try {
      const userProfile = users.find(u => u.uid === selectedUserId);
      if (!userProfile) throw new Error('User not found');

      const depositsQuery = query(collection(db, 'deposit_requests'), where('userId', '==', selectedUserId));
      const depositSnapshot = await getDocs(depositsQuery);
      const depositRequests = depositSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          date: data.date,
          amount: data.amount,
          status: data.status,
          comprobanteURL: data.comprobanteURL,
        };
      });

      const result = await adminUserInsightSummary({
        userId: userProfile.uid,
        userProfile: {
          name: userProfile.name,
          email: userProfile.email,
          role: userProfile.rol,
          saldoUSDT: userProfile.saldoUSDT,
        },
        depositRequests,
      });
      setInsight(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.insights')}</CardTitle>
        <CardDescription>Análisis de actividad de usuario con IA.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Select onValueChange={setSelectedUserId}>
            <SelectTrigger><SelectValue placeholder={t('admin.selectUser')} /></SelectTrigger>
            <SelectContent>
              {users.map(user => <SelectItem key={user.uid} value={user.uid}>{user.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleGetInsight} disabled={!selectedUserId || loading}>
            {loading ? <Loader2 className="animate-spin" /> : t('admin.getInsights')}
          </Button>
        </div>
        {insight && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="font-semibold">{t('admin.summary')}</h3>
              <p className="text-sm text-muted-foreground">{insight.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold">{t('admin.unusualPatterns')}</h3>
              <Badge variant={insight.unusualPatternsDetected ? 'destructive' : 'default'}>
                {insight.unusualPatternsDetected ? 'Detectado' : 'No Detectado'}
              </Badge>
            </div>
            <div>
              <h3 className="font-semibold">{t('admin.unusualPatternsDesc')}</h3>
              <p className="text-sm text-muted-foreground">{insight.unusualPatternsDescription}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user?.rol !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user?.rol !== 'admin') {
    return <SplashScreen />;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">{t('admin.title')}</h1>
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="deposits">{t('admin.deposits')}</TabsTrigger>
          <TabsTrigger value="insights">{t('admin.insights')}</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="deposits"><DepositsTab /></TabsContent>
        <TabsContent value="insights"><AiInsightsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
