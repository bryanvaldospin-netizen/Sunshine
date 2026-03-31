'use server';

import { z } from 'zod';
import type { UserProfile, Investment } from '@/types';
import * as system from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';


// Initialize Firebase Admin SDK with explicit project ID
// This gives the server-side actions privileged access to bypass security rules.
if (!system.apps.length) {
    try {
        system.initializeApp(); // Use application default credentials
    } catch (error) {
        console.error("Firebase system initialization error:", error);
    }
}
const systemDb = system.firestore();
const systemAuth = system.auth();


// USER ACTIONS
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  sponsorCode: z.string().optional(),
  walletAddress: z.string().min(20, 'La dirección de la billetera no es válida.'),
});

export async function registerUser(values: z.infer<typeof registerSchema>): Promise<{success: true, token: string | null, message?: string} | {error: string}> {
  try {
     if (!system.apps.length || !systemDb) {
        throw new Error('La conexión con el servidor de autenticación falló.');
    }

    const validatedValues = registerSchema.parse(values);
    const { email, password, name, walletAddress, sponsorCode } = validatedValues;
    
    const walletRef = systemDb.collection('wallet_addresses').doc(walletAddress);
    const walletSnap = await walletRef.get();
    if (walletSnap.exists) {
      return { error: 'Error: Esta billetera ya está vinculada a otra cuenta. Usa una dirección única.' };
    }

    let invitadoPor: string | null = null;
    if (sponsorCode) {
      const sponsorCodeRef = systemDb.collection('invite_codes_map').doc(sponsorCode.trim());
      const sponsorCodeSnap = await sponsorCodeRef.get();

      if (!sponsorCodeSnap.exists) {
        return { error: 'El código de patrocinador no existe' };
      }
      const sponsorData = sponsorCodeSnap.data();
      invitadoPor = sponsorData!.userId;
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
            const codeRef = systemDb.collection('invite_codes_map').doc(code);
            const codeSnap = await codeRef.get();
            if (!codeSnap.exists) {
                isUnique = true;
            }
        }
        return code!;
    };

    const inviteCode = await generateUniqueInviteCode();
    
    const userRecord = await systemAuth.createUser({
      email,
      password,
      displayName: name,
    });
    const user = userRecord;

    const batch = systemDb.batch();
    
    const userDocRef = systemDb.collection('users').doc(user.uid);
    
    batch.set(userDocRef, {
      uid: user.uid,
      name,
      email,
      rol: 'user',
      saldoUSDT: 0,
      totalInvested: 0,
      retirosTotales: 0,
      invitadoPor: invitadoPor,
      inviteCode: inviteCode,
      walletAddress: walletAddress,
      ultimoCheckIn: null,
      bonoDirecto: 0,
      bonoRetirable: 0,
      hasUnclaimedBonuses: false,
      fechaRegistro: new Date().toISOString(),
      lastConsolidation: null,
      isVip: true, // All users are now VIP
    });

    const newWalletRef = systemDb.collection('wallet_addresses').doc(walletAddress);
    batch.set(newWalletRef, {
        userId: user.uid,
        createdAt: new Date().toISOString()
    });
    
    const userInviteCodeRef = systemDb.collection('invite_codes_map').doc(inviteCode);
    batch.set(userInviteCodeRef, {
        userId: user.uid
    });

    // Commit the essential user creation documents first.
    await batch.commit();

    try {
        const transactionRef = userDocRef.collection('transacciones').doc();
        await transactionRef.set({
            fecha: new Date().toISOString(),
            tipo: 'Sistema',
            descripcion: '¡Bienvenido a Sunshine! Tu cuenta ha sido creada.',
            monto: 0
        });
    } catch (transactionError) {
        console.error(`Non-critical error: Failed to create welcome transaction for user ${user.uid}:`, transactionError);
    }


    try {
        const customToken = await systemAuth.createCustomToken(user.uid);
        return { success: true, token: customToken };
    } catch (tokenError) {
        console.error("Error creating custom token:", tokenError);
        return { success: true, token: null, message: '¡Registro completo! Por favor, inicia sesión para continuar.' };
    }
    
  } catch (error: any) {
    console.error('Error durante el registro:', error.message);
    if (error.code === 'auth/email-already-exists') {
      return { error: 'Este correo electrónico ya está en uso.' };
    }
     if (error.code === 'permission-denied') {
      return { error: 'Error de permisos al intentar registrar el usuario. Por favor, revisa la configuración del servidor.' };
    }
    if (error instanceof z.ZodError) {
      return { error: error.errors.map(e => e.message).join(', ') };
    }
    if (error.message.includes('La conexión con el servidor de autenticación falló')) {
       return { error: 'Error del servidor: No se pudo conectar con los servicios de autenticación. Por favor, inténtalo de nuevo más tarde.' };
    }
    return { error: error.message || 'Ocurrió un error inesperado durante el registro.' };
  }
}

export async function syncInviteCodes() {
  try {
    const usersCollectionRef = systemDb.collection('users');
    const usersSnapshot = await usersCollectionRef.get();

    if (usersSnapshot.empty) {
      return { success: true, message: 'No se encontraron usuarios para sincronizar.' };
    }

    const batch = systemDb.batch();
    let updatedUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      let userUpdate: {[key: string]: any} = {};

      if (userData.inviteCode && typeof userData.inviteCode === 'string') {
        const inviteCodeMapRef = systemDb.collection('invite_codes_map').doc(userData.inviteCode);
        const inviteCodeMapSnap = await inviteCodeMapRef.get();
        if (!inviteCodeMapSnap.exists) {
          batch.set(inviteCodeMapRef, { userId });
        }
      }

      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoDirecto')) userUpdate.bonoDirecto = 0;
      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoRetirable')) userUpdate.bonoRetirable = 0;
      if (!Object.prototype.hasOwnProperty.call(userData, 'retirosTotales')) userUpdate.retirosTotales = 0;
      if (!Object.prototype.hasOwnProperty.call(userData, 'totalInvested')) userUpdate.totalInvested = 0;
      if (!Object.prototype.hasOwnProperty.call(userData, 'hasUnclaimedBonuses')) userUpdate.hasUnclaimedBonuses = false;
      if (!Object.prototype.hasOwnProperty.call(userData, 'isVip')) userUpdate.isVip = true;

      // Universal balance cleanup logic
      if (userData.saldoUSDT != null && userData.saldoUSDT > 0 && userData.saldoUSDT < 1) {
        userUpdate.saldoUSDT = 0;
      }

      if (Object.keys(userUpdate).length > 0) {
        batch.update(userDoc.ref, userUpdate);
        updatedUsers++;
      }
    }

    if (!batch.isEmpty) {
      await batch.commit();
    }

    return { success: true, message: `Sincronización y limpieza completada. ${updatedUsers} perfiles actualizados.` };
  } catch (error: any) {
    console.error('Error sincronizando datos:', error);
    return { error: 'Falló la sincronización de datos: ' + error.message };
  }
}

export async function processInitialBonus(referralId: string, sponsorId: string): Promise<{success: true, message: string} | {error: string}> {
  if (!referralId || !sponsorId) {
    return { error: 'Faltan IDs de referido o patrocinador.' };
  }

  const referralRef = systemDb.collection('users').doc(referralId);
  const sponsorRef = systemDb.collection('users').doc(sponsorId.trim());

  try {
    const resultMessage = await systemDb.runTransaction(async (transaction) => {
      const referralSnap = await transaction.get(referralRef);
      if (!referralSnap.exists) throw new Error('El usuario referido no existe.');
      const referralData = referralSnap.data() as UserProfile;

      const sponsorSnap = await transaction.get(sponsorRef);
      if (!sponsorSnap.exists) throw new Error('El patrocinador no fue encontrado.');
      const sponsorData = sponsorSnap.data() as UserProfile;

      if (referralData.invitadoPor !== sponsorId) throw new Error('No tienes permiso para reclamar este bono.');
      if (referralData.hasUnclaimedBonuses !== true) throw new Error('No hay bonos por reclamar para este usuario.');
      
      const sponsorTotalInvested = sponsorData.totalInvested ?? 0;
      if (sponsorTotalInvested <= 0) {
          return 'Bono no pagado: Necesitas un plan activo para recibir comisiones.';
      }

      const investmentsToProcessRef = referralRef.collection('investments').where('bonusPaid', '==', false);
      const investmentsToProcessSnap = await transaction.get(investmentsToProcessRef);
      
      if (investmentsToProcessSnap.empty) {
        transaction.update(referralRef, { hasUnclaimedBonuses: false });
        return 'No se encontraron nuevas inversiones para comisionar.';
      }

      let totalNewInvestment = 0;
      investmentsToProcessSnap.docs.forEach(doc => {
        totalNewInvestment += doc.data().amount;
      });

      if (totalNewInvestment <= 0) {
        return 'No hay nueva inversión para comisionar.';
      }

      const potentialCommission = totalNewInvestment * 0.10;
      const sponsorBonosDirectos = sponsorData.bonoDirecto ?? 0;
      const sponsorMaxBonus = sponsorTotalInvested * 3;

      if (sponsorBonosDirectos >= sponsorMaxBonus) {
          investmentsToProcessSnap.docs.forEach(doc => transaction.update(doc.ref, { bonusPaid: true }));
          transaction.update(referralRef, { hasUnclaimedBonuses: false });
          return 'Límite de ganancias del patrocinador (300%) alcanzado. El bono no fue entregado.';
      }

      const availableRoom = sponsorMaxBonus - sponsorBonosDirectos;
      const payableCommission = Math.round(Math.min(potentialCommission, availableRoom) * 100) / 100;

      let message: string;

      if (payableCommission > 0) {
          transaction.update(sponsorRef, {
              bonoDirecto: FieldValue.increment(payableCommission),
              bonoRetirable: FieldValue.increment(payableCommission),
          });

          const sponsorTransactionRef = sponsorRef.collection('transacciones').doc();
          transaction.set(sponsorTransactionRef, {
              fecha: new Date().toISOString(),
              tipo: 'Bono Directo',
              descripcion: `Comisión por inversión de ${referralData.name}`,
              monto: payableCommission
          });
          
          message = `¡Bono de ${payableCommission.toFixed(2)} USDT reclamado con éxito!`;
      } else {
          message = 'El bono no pudo ser pagado porque el patrocinador no tenía margen de ganancia.';
      }

      investmentsToProcessSnap.docs.forEach(doc => transaction.update(doc.ref, { bonusPaid: true }));
      transaction.update(referralRef, { hasUnclaimedBonuses: false });
      return message;
    });

    return { success: true, message: resultMessage };

  } catch (error: any) {
    console.error(`Error en processInitialBonus para el referido ${referralId}:`, error.message);
    return { error: `Error del Servidor: ${error.message}` };
  }
}

const getDailyRate = (planAmount: number): number => {
    if (planAmount >= 1001) return 0.028; // 2.8%
    if (planAmount >= 501) return 0.026;  // 2.6%
    if (planAmount >= 101) return 0.024;  // 2.4%
    if (planAmount >= 20) return 0.020;   // 2.0%
    return 0;
};

async function consolidateAndGetMainBalance(db: system.firestore.Firestore, userId: string, consolidationTime: Date): Promise<number> {
    const userRef = db.collection('users').doc(userId);

    return await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) throw new Error("User not found for consolidation");
        const user = userSnap.data() as UserProfile;

        const investmentsRef = userRef.collection('investments').where('status', '==', 'active');
        const investmentsSnap = await transaction.get(investmentsRef);

        let totalEarnedSinceLast = 0;
        let totalActiveInvestment = 0;
        const lastConsolidationDate = user.lastConsolidation ? new Date(user.lastConsolidation) : new Date(user.fechaRegistro || consolidationTime);

        if (!investmentsSnap.empty) {
            investmentsSnap.forEach(invDoc => {
                const investment = invDoc.data() as Investment;
                totalActiveInvestment += investment.amount;
                
                const startDate = new Date(investment.startDate);
                const calculationStartDate = startDate > lastConsolidationDate ? startDate : lastConsolidationDate;
                const diffTime = consolidationTime.getTime() - calculationStartDate.getTime();
                
                if (diffTime > 0) {
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    const investmentROI = investment.amount * investment.dailyRate * diffDays;
                    
                    const maxEarning = investment.amount * 3;
                    const potentialTotalEarning = investment.earningsGenerated + investmentROI;

                    if (potentialTotalEarning >= maxEarning) {
                        const finalEarning = maxEarning - investment.earningsGenerated;
                        totalEarnedSinceLast += finalEarning;
                        transaction.update(invDoc.ref, { 
                            earningsGenerated: maxEarning,
                            status: 'completed'
                        });
                    } else {
                        totalEarnedSinceLast += investmentROI;
                        transaction.update(invDoc.ref, { earningsGenerated: FieldValue.increment(investmentROI) });
                    }
                }
            });
        }
        
        // Update user's main balance and consolidation time
        if (totalEarnedSinceLast > 0) {
            transaction.update(userRef, { saldoUSDT: FieldValue.increment(totalEarnedSinceLast) });
        }
        transaction.update(userRef, { 
            lastConsolidation: consolidationTime.toISOString(),
            totalInvested: totalActiveInvestment
        });
        
        const finalBalance = (user.saldoUSDT || 0) + totalEarnedSinceLast;
        return parseFloat(finalBalance.toFixed(2));
    });
}

const withdrawalSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser un número positivo.'),
  user: z.object({
    uid: z.string(),
    email: z.string().email(),
    saldoUSDT: z.number(),
    bonoRetirable: z.number().optional(),
    retirosTotales: z.number().optional(),
  }),
  withdrawalType: z.enum(['referral', 'main']),
});

export async function createWithdrawalToken(values: z.infer<typeof withdrawalSchema>): Promise<{ success: true, token: string } | { error: string }> {
  try {
    const validatedValues = withdrawalSchema.parse(values);
    const { amount, user, withdrawalType } = validatedValues;
    const userRef = systemDb.collection('users').doc(user.uid);
    const token = `COMPROBANTE-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const now = new Date();

    if (withdrawalType === 'referral') {
        const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
        const day = ukTime.getDate();
        if ([10, 20, 30].includes(day)) {
            throw new Error('Retiros de Bono Referido NO disponibles los días 10, 20 y 30.');
        }
        
        await systemDb.runTransaction(async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists) throw new Error('El usuario no existe.');
            const dbUser = userSnap.data() as UserProfile;

            const bonoRetirable = dbUser.bonoRetirable ?? 0;
            if (amount > bonoRetirable) {
                throw new Error(`Saldo de bono insuficiente. Disponible: ${bonoRetirable.toFixed(2)} USDT.`);
            }
            
            transaction.update(userRef, {
                bonoRetirable: FieldValue.increment(-amount),
                retirosTotales: FieldValue.increment(amount),
            });

            const tokenRef = systemDb.collection('retiro_tokens').doc();
            transaction.set(tokenRef, {
              correo: user.email,
              token,
              monto: amount,
              estado: 'pendiente',
              fecha: FieldValue.serverTimestamp(),
              uid: user.uid,
              tipoRetiro: 'bono_referido',
              fechaUK: now.toLocaleString('en-GB', { timeZone: 'Europe/London' }),
            });
        });

    } else { // withdrawalType === 'main'
        const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
        const day = ukTime.getDate();
        if (![10, 20, 30].includes(day)) {
            throw new Error('Retiros de Saldo Actual disponibles solo los días 10, 20 y 30 del mes.');
        }
        
        const availableBalance = await consolidateAndGetMainBalance(systemDb, user.uid, now);
        
        if (amount > availableBalance) {
            throw new Error(`Saldo actual insuficiente. Disponible: ${availableBalance.toFixed(2)} USDT.`);
        }

        await systemDb.runTransaction(async (transaction) => {
            transaction.update(userRef, {
                saldoUSDT: FieldValue.increment(-amount),
                retirosTotales: FieldValue.increment(amount),
            });

            const tokenRef = systemDb.collection('retiro_tokens').doc();
            transaction.set(tokenRef, {
              correo: user.email,
              token,
              monto: amount,
              estado: 'pendiente',
              fecha: FieldValue.serverTimestamp(),
              uid: user.uid,
              tipoRetiro: 'saldo_actual',
              fechaUK: now.toLocaleString('en-GB', { timeZone: 'Europe/London' }),
            });
        });
    }

    return { success: true, token };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Error creating withdrawal token:', error);
    return { error: error.message || 'Ocurrió un error inesperado al generar el token.' };
  }
}

export async function getSecondLevelReferrals(directReferralId: string): Promise<{ success: true, data: UserProfile[] } | { success: false, error: string, data: [] }> {
  if (!directReferralId) {
    return { success: false, error: 'Se requiere el ID del referido directo.', data: [] };
  }

  try {
    const l2QuerySnapshot = await systemDb.collection('users').where('invitadoPor', '==', directReferralId).get();

    if (l2QuerySnapshot.empty) {
      return { success: true, data: [] };
    }

    const l2Referrals = l2QuerySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || '',
          email: data.email || '',
          totalInvested: data.totalInvested ?? 0,
        } as UserProfile;
      });

    return { success: true, data: l2Referrals };

  } catch (error: any) {
    console.error('Error al buscar referidos de segundo nivel:', error);
    return { success: false, error: 'Error del servidor al procesar la solicitud.', data: [] };
  }
}

export async function reconcileAccount(userId: string): Promise<{success: true, message: string} | {error: string}> {
    if (!userId) {
      return { error: 'User ID is missing.' };
    }
  
    try {
        await consolidateAndGetMainBalance(systemDb, userId, new Date());
        return { success: true, message: 'La cuenta ha sido conciliada.' };
  
    } catch (error: any) {
      console.error(`Error en reconcileAccount para el usuario ${userId}:`, error.message);
      return { error: `Error del Servidor durante la conciliación: ${error.message}` };
    }
}

export async function activateInvestment(userId: string, amount: number): Promise<{ success: true, message: string } | { error: string }> {
  if (!userId || !amount) {
    return { error: 'Faltan datos para activar la inversión.' };
  }
  if (amount < 20) {
    return { error: 'La inversión mínima es de 20 USDT.' };
  }

  const userRef = systemDb.collection('users').doc(userId);
  const dailyRate = getDailyRate(amount);

  try {
    await systemDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error('Usuario no encontrado.');
      }
      const userData = userSnap.data() as UserProfile;

      if ((userData.saldoUSDT ?? 0) < amount) {
        throw new Error('Saldo insuficiente en la billetera.');
      }

      // 1. Decrement wallet balance and increment total invested
      transaction.update(userRef, {
        saldoUSDT: FieldValue.increment(-amount),
        totalInvested: FieldValue.increment(amount)
      });

      // 2. Create the new investment document
      const investmentRef = userRef.collection('investments').doc();
      transaction.set(investmentRef, {
        amount,
        dailyRate,
        startDate: new Date().toISOString(),
        status: 'active',
        earningsGenerated: 0,
        bonusPaid: false,
      });

      // 3. Create a transaction log
      const transactionRef = userRef.collection('transacciones').doc();
      transaction.set(transactionRef, {
        fecha: new Date().toISOString(),
        tipo: 'Activación de Plan',
        descripcion: `Inversión VIP de ${amount.toFixed(2)} USDT activada`,
        monto: amount,
      });
      
      // 4. Set flag for sponsor to claim bonus
      if (userData.invitadoPor) {
        const sponsorRef = systemDb.collection('users').doc(userData.invitadoPor);
        transaction.set(sponsorRef, { hasUnclaimedBonuses: true }, { merge: true });
      }
    });

    return { success: true, message: `¡Inversión de ${amount} USDT activada con éxito!` };
  } catch (error: any) {
    console.error(`Error activating investment for user ${userId}:`, error);
    return { error: error.message || 'Ocurrió un error inesperado.' };
  }
}
