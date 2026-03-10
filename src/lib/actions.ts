'use server';

import {
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  writeBatch,
  query,
  collection,
  where,
  limit,
  getDocs,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { z } from 'zod';
import type { UserProfile } from '@/types';

// USER ACTIONS
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  sponsorCode: z.string().optional(),
  walletAddress: z.string().min(20, 'La dirección de la billetera no es válida.'),
});

export async function registerUser(values: z.infer<typeof registerSchema>) {
  try {
    const validatedValues = registerSchema.parse(values);
    const { email, password, name, walletAddress, sponsorCode } = validatedValues;
    
    const walletRef = doc(db, 'wallet_addresses', walletAddress);
    const walletSnap = await getDoc(walletRef);
    if (walletSnap.exists()) {
      return { error: 'Error: Esta billetera ya está vinculada a otra cuenta. Usa una dirección única.' };
    }

    let invitadoPor: string | null = null;
    if (sponsorCode) {
      console.log('Buscando patrocinador:', sponsorCode);
      const sponsorCodeRef = doc(db, 'invite_codes_map', sponsorCode);
      const sponsorCodeSnap = await getDoc(sponsorCodeRef);

      if (!sponsorCodeSnap.exists()) {
        return { error: 'El código de patrocinador no existe' };
      }
      const sponsorData = sponsorCodeSnap.data();
      invitadoPor = sponsorData.userId;
    }

    const generateUniqueInviteCode = async (): Promise<string> => {
        let code: string;
        let isUnique = false;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        while (!isUnique) {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const codeRef = doc(db, 'invite_codes_map', code);
            const codeSnap = await getDoc(codeRef);
            if (!codeSnap.exists()) {
                isUnique = true;
            }
        }
        return code!;
    };

    const inviteCode = await generateUniqueInviteCode();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const batch = writeBatch(db);
    
    const userDocRef = doc(db, 'users', user.uid);
    batch.set(userDocRef, {
      uid: user.uid,
      name,
      email,
      rol: 'user',
      saldoUSDT: 0,
      invitadoPor: invitadoPor,
      inviteCode: inviteCode,
      walletAddress: walletAddress,
      ultimoCheckIn: null,
      planActivo: 0,
      fechaInicioPlan: null,
      bonoDirecto: 0,
    });

    const newWalletRef = doc(db, 'wallet_addresses', walletAddress);
    batch.set(newWalletRef, {
        userId: user.uid,
        createdAt: new Date().toISOString()
    });
    
    const userInviteCodeRef = doc(db, 'invite_codes_map', inviteCode);
    batch.set(userInviteCodeRef, {
        userId: user.uid
    });

    await batch.commit();
    
    console.log(`Código ${inviteCode} y billetera ${walletAddress} asignados exitosamente al usuario ${user.uid}. Patrocinador: ${invitadoPor}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error detectado:', error);
    if (error.code === 'auth/email-already-in-use') {
      return { error: 'Este correo electrónico ya está en uso.' };
    }
    if (error instanceof z.ZodError) {
      return { error: error.errors.map(e => e.message).join(', ') };
    }
    return { error: error.message || 'Ocurrió un error inesperado durante el registro.' };
  }
}

export async function getWalletAddress() {
  return process.env.USDT_WALLET_ADDRESS || '0xe37a298c740caf1411cbccda7b250a0664a00129';
}

export async function syncInviteCodes() {
  try {
    const usersCollectionRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollectionRef);

    if (usersSnapshot.empty) {
      return { success: true, message: 'No se encontraron usuarios para sincronizar.' };
    }

    const batch = writeBatch(db);
    let syncedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      if (userData.inviteCode && typeof userData.inviteCode === 'string') {
        const inviteCode = userData.inviteCode;
        
        const inviteCodeMapRef = doc(db, 'invite_codes_map', inviteCode);
        const inviteCodeMapSnap = await getDoc(inviteCodeMapRef);

        if (!inviteCodeMapSnap.exists()) {
          batch.set(inviteCodeMapRef, { userId });
          syncedCount++;
        }
      }
    }

    if (syncedCount > 0) {
      await batch.commit();
    }

    return { success: true, message: `Se sincronizaron ${syncedCount} nuevos códigos de invitación.` };
  } catch (error: any) {
    console.error('Error sincronizando códigos:', error);
    return { error: 'Falló la sincronización de códigos de invitación: ' + error.message };
  }
}

export async function activateInvestment(userId: string, investmentAmount: number, planName: string) {
  try {
    if (!userId || !investmentAmount || investmentAmount <= 0) {
      return { error: 'Se requieren el ID de usuario y un monto de inversión válido.' };
    }

    await runTransaction(db, async (transaction) => {
      // 1. Get user and potentially sponsor documents
      const userRef = doc(db, 'users', userId);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error('El usuario a activar no existe.');
      }
      const userData = userSnap.data() as UserProfile;

      // 2. Create the official Investment document
      const investmentRef = doc(collection(db, 'investments'));
      const nextPaymentDate = new Date();
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);

      transaction.set(investmentRef, {
        userId,
        planName,
        amount: investmentAmount,
        startDate: new Date().toISOString(),
        nextPaymentDate: nextPaymentDate.toISOString(),
        status: 'Activo',
      });

      // 3. Update the user's profile
      transaction.update(userRef, {
        planActivo: increment(investmentAmount),
        saldoUSDT: increment(investmentAmount),
        fechaInicioPlan: new Date().toISOString(),
      });

      // 4. Update sponsor if they exist and calculate commission with ROI cap
      const sponsorId = userData.invitadoPor;
      if (sponsorId) {
        const sponsorRef = doc(db, 'users', sponsorId);
        const sponsorSnap = await transaction.get(sponsorRef);

        if (sponsorSnap.exists()) {
          const sponsorData = sponsorSnap.data() as UserProfile;
          const commission = investmentAmount * 0.10;

          const getDailyRate = (planAmount: number): number => {
            if (planAmount >= 1001) return 0.025;
            if (planAmount >= 501) return 0.020;
            if (planAmount >= 101) return 0.018;
            if (planAmount >= 20) return 0.015;
            return 0;
          };

          const sponsorPlanActivo = sponsorData.planActivo || 0;
          const sponsorFechaInicioStr = sponsorData.fechaInicioPlan;
          let personalEarnings = 0;
          
          if (sponsorPlanActivo > 0 && sponsorFechaInicioStr) {
            const dateValue = sponsorFechaInicioStr as any;
            const startDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
            
            if (!isNaN(startDate.getTime())) {
                const now = new Date();
                const diffTime = now.getTime() - startDate.getTime();
                if (diffTime > 0) {
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const dailyRate = getDailyRate(sponsorPlanActivo);
                    personalEarnings = sponsorPlanActivo * dailyRate * diffDays;
                }
            }
          }
          
          const currentBonos = sponsorData.bonoDirecto || 0;
          const currentTotalEarnings = personalEarnings + currentBonos;
          
          const maxEarnings = sponsorPlanActivo > 0 ? sponsorPlanActivo * 3 : Infinity;
          const remainingCapacity = maxEarnings - currentTotalEarnings;
          const payableCommission = Math.max(0, Math.min(commission, remainingCapacity));

          if (payableCommission > 0) {
            transaction.update(sponsorRef, {
              bonoDirecto: increment(payableCommission),
              saldoUSDT: increment(payableCommission),
            });
          }
        }
      }
    });

    return { success: true, message: 'Inversión activada y comisiones procesadas.' };

  } catch (error: any) {
    console.error('Error al activar inversión:', error);
    return { error: error.message || 'Error inesperado al activar la inversión.' };
  }
}
