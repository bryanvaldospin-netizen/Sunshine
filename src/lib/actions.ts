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
  updateDoc,
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
      bonoEntregado: false,
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
    let bonoEntregadoCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      if (userData.inviteCode && typeof userData.inviteCode === 'string') {
        const inviteCode = userData.inviteCode;
        const inviteCodeMapRef = doc(db, 'invite_codes_map', inviteCode);
        const inviteCodeMapSnap = await getDoc(inviteCodeMapRef);
        if (!inviteCodeMapSnap.exists()) {
          batch.set(inviteCodeMapRef, { userId });
          syncedCodesCount++;
        }
      }

      let userUpdate: {[key: string]: any} = {};
      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoDirecto')) {
        userUpdate.bonoDirecto = 0;
        updatedUsersCount++;
      }
      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoEntregado')) {
        userUpdate.bonoEntregado = false;
        bonoEntregadoCount++;
      }

      if (Object.keys(userUpdate).length > 0) {
        batch.update(userDoc.ref, userUpdate);
      }
    }

    if (syncedCodesCount > 0 || updatedUsersCount > 0 || bonoEntregadoCount > 0) {
      await batch.commit();
    }

    const messages = [];
    if (syncedCodesCount > 0) messages.push(`Se sincronizaron ${syncedCodesCount} nuevos códigos de invitación.`);
    if (updatedUsersCount > 0) messages.push(`Se actualizaron ${updatedUsersCount} perfiles con 'bonoDirecto'.`);
    if (bonoEntregadoCount > 0) messages.push(`Se inicializaron ${bonoEntregadoCount} perfiles con 'bonoEntregado'.`);

    const message = messages.length > 0 ? messages.join(' ') : 'Todos los usuarios ya están actualizados.';
    
    return { success: true, message };
  } catch (error: any) {
    console.error('Error sincronizando datos:', error);
    return { error: 'Falló la sincronización de datos: ' + error.message };
  }
}

export async function processInitialBonus(userId: string) {
  try {
    const resultMessage = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', userId);
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists()) {
        throw new Error('El usuario no existe.');
      }
      const userData = userSnap.data() as UserProfile;
      
      const { planActivo, bonoEntregado, invitadoPor } = userData;

      if (bonoEntregado === true || !(planActivo && planActivo > 0)) {
        return "No action needed. Bonus already paid or no active plan.";
      }
      
      // CRITICAL: Update the user's bonus status FIRST within the transaction to prevent loops.
      transaction.update(userRef, { bonoEntregado: true });
      
      if (invitadoPor) {
          const sponsorRef = doc(db, 'users', invitadoPor);
          const sponsorSnap = await transaction.get(sponsorRef);

          if (sponsorSnap.exists()) {
              const sponsorData = sponsorSnap.data() as UserProfile;
              const commission = (planActivo || 0) * 0.10;

              const getDailyRate = (amount: number): number => {
                if (amount >= 1001) return 0.025;
                if (amount >= 501) return 0.020;
                if (amount >= 101) return 0.018;
                if (amount >= 20) return 0.015;
                return 0;
              };
              
              let personalEarnings = 0;
              const sponsorPlanActivo = sponsorData.planActivo || 0;
              if (sponsorPlanActivo > 0 && sponsorData.fechaInicioPlan) {
                const dateValue = sponsorData.fechaInicioPlan as any;
                const startDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
                if (!isNaN(startDate.getTime())) {
                    const diffDays = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) personalEarnings = sponsorPlanActivo * getDailyRate(sponsorPlanActivo) * diffDays;
                }
              }

              const currentTotalEarnings = personalEarnings + (sponsorData.bonoDirecto || 0);
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
      
      return `Bono inicial para el usuario ${userId} procesado correctamente.`;
    });

    return { success: true, message: resultMessage };

  } catch (error: any) {
    return { error: error.message || 'Error inesperado procesando el bono.' };
  }
}
