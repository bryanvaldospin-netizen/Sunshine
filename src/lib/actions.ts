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
import type { UserProfile, Investment } from '@/types';

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
      fechaRegistro: new Date().toISOString(),
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
    let syncedCodesCount = 0;
    let updatedUsersCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Part 1: Sync invite codes to invite_codes_map
      if (userData.inviteCode && typeof userData.inviteCode === 'string') {
        const inviteCode = userData.inviteCode;
        
        const inviteCodeMapRef = doc(db, 'invite_codes_map', inviteCode);
        const inviteCodeMapSnap = await getDoc(inviteCodeMapRef);

        if (!inviteCodeMapSnap.exists()) {
          batch.set(inviteCodeMapRef, { userId });
          syncedCodesCount++;
        }
      }

      // Part 2: Add bonoDirecto field if missing
      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoDirecto')) {
        batch.update(userDoc.ref, { bonoDirecto: 0 });
        updatedUsersCount++;
      }
    }

    if (syncedCodesCount > 0 || updatedUsersCount > 0) {
      await batch.commit();
    }

    const messages = [];
    if (syncedCodesCount > 0) {
        messages.push(`Se sincronizaron ${syncedCodesCount} nuevos códigos de invitación.`);
    }
    if (updatedUsersCount > 0) {
        messages.push(`Se actualizaron ${updatedUsersCount} perfiles con 'bonoDirecto'.`);
    }

    const message = messages.length > 0 ? messages.join(' ') : 'Todos los usuarios ya están actualizados.';
    
    return { success: true, message };
  } catch (error: any) {
    console.error('Error sincronizando datos:', error);
    return { error: 'Falló la sincronización de datos: ' + error.message };
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
        bonoPagado: true, // Bonus is paid in this transaction
      });

      // 3. Update the user's profile
      transaction.update(userRef, {
        planActivo: increment(investmentAmount),
        saldoUSDT: increment(investmentAmount),
        fechaInicioPlan: userData.planActivo === 0 ? new Date().toISOString() : userData.fechaInicioPlan,
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


export async function processInvestmentBonus(investment: Investment) {
  try {
    if (!investment || !investment.userId || !investment.amount || investment.amount <= 0) {
      throw new Error('Datos de inversión inválidos para procesar el bono.');
    }
    
    await runTransaction(db, async (transaction) => {
      // 1. Get user and sponsor documents
      const userRef = doc(db, 'users', investment.userId);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error(`Usuario ${investment.userId} no encontrado.`);
      }
      const userData = userSnap.data() as UserProfile;

      // 2. Update user's own balance and active plan total
      transaction.update(userRef, {
        planActivo: increment(investment.amount),
        saldoUSDT: increment(investment.amount),
        fechaInicioPlan: (userData.planActivo || 0) <= 0 ? new Date().toISOString() : userData.fechaInicioPlan,
      });
      
      // 3. Handle sponsor bonus payment
      const sponsorId = userData.invitadoPor;
      if (sponsorId) {
        const sponsorRef = doc(db, 'users', sponsorId);
        const sponsorSnap = await transaction.get(sponsorRef);

        if (sponsorSnap.exists()) {
          const sponsorData = sponsorSnap.data() as UserProfile;
          const commission = investment.amount * 0.10;

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
      
      // 4. Mark investment as paid to prevent re-processing
      const investmentRef = doc(db, 'investments', investment.id);
      transaction.update(investmentRef, { bonoPagado: true });
    });

    return { success: true, message: `Bono para la inversión ${investment.id} procesado.` };

  } catch (error: any) {
    console.error('Error procesando bono de inversión:', error);
    const investmentRef = doc(db, 'investments', investment.id);
    await setDoc(investmentRef, { bonoPagado: false, error: error.message }, { merge: true });
    throw new Error(error.message || 'Error inesperado al procesar el bono.');
  }
}
