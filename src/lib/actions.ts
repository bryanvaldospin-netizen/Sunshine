
'use server';

import { z } from 'zod';
import type { UserProfile, Investment } from '@/types';
import * as system from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';


// Initialize Firebase Admin SDK with explicit project ID
if (!system.apps.length) {
    try {
        system.initializeApp(); // Use application default credentials
    } catch (error) {
        console.error("Firebase system initialization error:", error);
    }
}
const systemDb = system.firestore();
const systemAuth = system.auth();

const getDailyRate = (planAmount: number): number => {
    if (planAmount >= 1001) return 0.028; // 2.8%
    if (planAmount >= 501) return 0.026;  // 2.6%
    if (planAmount >= 101) return 0.024;  // 2.4%
    if (planAmount >= 20) return 0.020;   // 2.0%
    return 0;
};

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
      lastConsolidation: new Date().toISOString(),
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

export async function updateWalletAddress(userId: string, newAddress: string): Promise<{success: true, message: string} | {error: string}> {
    if (!userId || !newAddress) {
        return { error: 'Faltan datos para la actualización.' };
    }

    if (newAddress.length < 20) {
        return { error: 'La nueva dirección de billetera no es válida.' };
    }

    const userRef = systemDb.collection('users').doc(userId);
    const newWalletRef = systemDb.collection('wallet_addresses').doc(newAddress);

    try {
        const message = await systemDb.runTransaction(async (transaction) => {
            const newWalletSnap = await transaction.get(newWalletRef);
            if (newWalletSnap.exists) {
                throw new Error('Esta billetera ya está en uso por otra cuenta.');
            }

            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists) {
                throw new Error('El usuario no fue encontrado.');
            }
            const userData = userSnap.data() as UserProfile;
            const oldAddress = userData.walletAddress;

            transaction.update(userRef, { walletAddress: newAddress });
            transaction.set(newWalletRef, { userId: userId, createdAt: new Date().toISOString() });

            if (oldAddress) {
                const oldWalletRef = systemDb.collection('wallet_addresses').doc(oldAddress);
                transaction.delete(oldWalletRef);
            }
            
            return 'Tu dirección de billetera ha sido actualizada con éxito.';
        });

        return { success: true, message };

    } catch (error: any) {
        console.error(`Error actualizando la billetera para el usuario ${userId}:`, error.message);
        return { error: error.message || 'Ocurrió un error inesperado.' };
    }
}


export async function activateInvestment(userId: string, amount: number): Promise<{success: true, message: string} | {error: string}> {
  if (!userId || !amount || amount < 20) {
    return { error: 'Datos de inversión no válidos. El mínimo es 20 USDT.' };
  }

  const userRef = systemDb.collection('users').doc(userId);
  const investmentRef = userRef.collection('investments').doc();
  const transactionRef = userRef.collection('transacciones').doc();

  try {
    await systemDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error('Usuario no encontrado.');
      }
      const userData = userSnap.data() as UserProfile;

      const currentBalance = userData.saldoUSDT ?? 0;
      if (currentBalance < amount) {
        throw new Error(`Saldo de billetera insuficiente. Tienes ${currentBalance.toFixed(2)} USDT.`);
      }

      const dailyRate = getDailyRate(amount);
      if (dailyRate === 0) {
        throw new Error('No se pudo determinar una tasa de retorno para el monto de inversión especificado.');
      }

      const updates: { [key: string]: any } = {
        saldoUSDT: FieldValue.increment(-amount),
        totalInvested: FieldValue.increment(amount),
      };

      if (userData.invitadoPor) {
        updates.hasUnclaimedBonuses = true;
      }
      
      transaction.update(userRef, updates);

      const now = new Date();
      transaction.set(investmentRef, {
        amount: amount,
        startDate: now.toISOString(),
        status: 'active',
        dailyRate: dailyRate,
        earningsGenerated: 0,
        lastUpdated: now.toISOString(),
        bonusPaid: false,
      });

      transaction.set(transactionRef, {
        fecha: now.toISOString(),
        tipo: 'Activación de Plan',
        descripcion: `Inversión VIP activada: ${amount.toFixed(2)} USDT`,
        monto: amount
      });
    });

    return { success: true, message: `¡Inversión de ${amount.toFixed(2)} USDT activada con éxito!` };

  } catch (error: any) {
    console.error(`Error activating investment for user ${userId}:`, error);
    return { error: error.message || 'Ocurrió un error inesperado al activar la inversión.' };
  }
}

export async function getWalletAddress() {
  return "0x471d4424e1016a256a256a8d13283522302cb020a4d2";
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

      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoDirecto')) {
        userUpdate.bonoDirecto = 0;
      }
      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoRetirable')) {
        userUpdate.bonoRetirable = 0;
      }
       if (!Object.prototype.hasOwnProperty.call(userData, 'retirosTotales')) {
        userUpdate.retirosTotales = 0;
      }

      if (userData.saldoUSDT != null && userData.saldoUSDT > 0 && userData.saldoUSDT < 1) {
        userUpdate.saldoUSDT = 0;
      }

      if (Object.keys(userUpdate).length > 0) {
        batch.update(userDoc.ref, userUpdate);
        updatedUsers++;
      }
    }

    if (updatedUsers > 0) {
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
    const sponsorRef = systemDb.collection('users').doc(sponsorId);
    const investmentsRef = referralRef.collection('investments');

    try {
        const resultMessage = await systemDb.runTransaction(async (transaction) => {
            const referralSnap = await transaction.get(referralRef);
            if (!referralSnap.exists) {
                throw new Error('El usuario referido no fue encontrado.');
            }
            const referralData = referralSnap.data() as UserProfile;

            if (referralData.invitadoPor !== sponsorId) {
                throw new Error('No tienes permiso para reclamar este bono.');
            }

            if (!referralData.hasUnclaimedBonuses) {
                 return 'No hay bonos nuevos para reclamar de este usuario.';
            }

            const unclaimedInvestmentsQuery = investmentsRef.where('bonusPaid', '==', false);
            const unclaimedInvestmentsSnap = await transaction.get(unclaimedInvestmentsQuery);

            if (unclaimedInvestmentsSnap.empty) {
                transaction.update(referralRef, { hasUnclaimedBonuses: false });
                return 'No hay bonos nuevos para reclamar de este usuario.';
            }

            const totalNewInvestmentAmount = unclaimedInvestmentsSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

            if (totalNewInvestmentAmount <= 0) {
                transaction.update(referralRef, { hasUnclaimedBonuses: false });
                return 'No hay monto de inversión nuevo para comisionar.';
            }

            const sponsorSnap = await transaction.get(sponsorRef);
            if (!sponsorSnap.exists) {
                throw new Error('El patrocinador no fue encontrado.');
            }
            const sponsorData = sponsorSnap.data() as UserProfile;

            if ((sponsorData.totalInvested ?? 0) <= 0) {
                return 'Bono no pagado: Necesitas tener una inversión activa para recibir comisiones de red.';
            }

            const potentialCommission = totalNewInvestmentAmount * 0.10;
            
            const sponsorTotalInvested = sponsorData.totalInvested ?? 0;
            const sponsorMaxBonus = sponsorTotalInvested * 3;
            const sponsorCurrentEarnings = (await consolidateUserEarnings(sponsorId, new Date(), transaction)) + (sponsorData.bonoDirecto ?? 0);
            
            if (sponsorCurrentEarnings >= sponsorMaxBonus) {
                unclaimedInvestmentsSnap.docs.forEach(doc => transaction.update(doc.ref, { bonusPaid: true }));
                transaction.update(referralRef, { hasUnclaimedBonuses: false });
                return 'Límite de ganancias del patrocinador (300%) alcanzado. El bono no fue entregado.';
            }

            const availableRoom = sponsorMaxBonus - sponsorCurrentEarnings;
            const payableCommission = parseFloat(Math.min(potentialCommission, availableRoom).toFixed(2));

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
                message = 'El bono no pudo ser pagado porque no había margen de ganancia o el monto era cero.';
            }
            
            unclaimedInvestmentsSnap.docs.forEach(doc => transaction.update(doc.ref, { bonusPaid: true }));
            transaction.update(referralRef, { hasUnclaimedBonuses: false });

            return message;
        });

        return { success: true, message: resultMessage };

    } catch (error: any) {
        console.error(`Error en processInitialBonus para el referido ${referralId}:`, error.message);
        return { error: `Error del Servidor: ${error.message}` };
    }
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

async function consolidateUserEarnings(userId: string, consolidationTime: Date, transaction: FirebaseFirestore.Transaction): Promise<number> {
    const userRef = systemDb.collection('users').doc(userId);
    const investmentsRef = userRef.collection('investments');

    const activeInvestmentsSnap = await transaction.get(investmentsRef.where('status', '==', 'active'));

    let totalNewEarnings = 0;

    for (const invDoc of activeInvestmentsSnap.docs) {
        const inv = invDoc.data() as Investment & { lastUpdated?: string };
        const startDate = new Date(inv.startDate);
        const lastUpdated = inv.lastUpdated ? new Date(inv.lastUpdated) : startDate;

        const diffTime = consolidationTime.getTime() - lastUpdated.getTime();
        if (diffTime <= 0) continue;

        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        let newEarning = inv.amount * inv.dailyRate * diffDays;

        const currentEarnings = inv.earningsGenerated ?? 0;
        const maxEarning = inv.amount * 3;

        const updateData: any = {};

        if (currentEarnings + newEarning >= maxEarning) {
            newEarning = maxEarning - currentEarnings;
            if (newEarning < 0) newEarning = 0;
            updateData.status = 'completed';
        }

        if (newEarning > 0) {
            totalNewEarnings += newEarning;
            updateData.earningsGenerated = FieldValue.increment(newEarning);
        }

        updateData.lastUpdated = consolidationTime.toISOString();
        transaction.update(invDoc.ref, updateData);
    }
    
    if (totalNewEarnings > 0) {
        transaction.update(userRef, {
            saldoUSDT: FieldValue.increment(totalNewEarnings),
            lastConsolidation: consolidationTime.toISOString(),
        });
    } else {
        transaction.update(userRef, { lastConsolidation: consolidationTime.toISOString() });
    }

    return totalNewEarnings;
}


export async function createWithdrawalToken(values: z.infer<typeof withdrawalSchema>): Promise<{ success: true, token: string } | { error: string }> {
  try {
    const validatedValues = withdrawalSchema.parse(values);
    const { amount, user, withdrawalType } = validatedValues;
    const userRef = systemDb.collection('users').doc(user.uid);
    const token = `COMPROBANTE-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const now = new Date();

    await systemDb.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) {
            throw new Error('El usuario no existe.');
        }
        const dbUser = userSnap.data() as UserProfile;
        
        if (withdrawalType === 'referral') {
            const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
            const day = ukTime.getDate();
            if ([10, 20, 30].includes(day)) {
                throw new Error('Retiros de Bono Referido no disponibles los días 10, 20 y 30.');
            }

            const bonoRetirable = dbUser.bonoRetirable ?? 0;
            if (amount > bonoRetirable) {
                throw new Error(`Saldo de bono insuficiente. Disponible: ${bonoRetirable.toFixed(2)} USDT.`);
            }
            
            transaction.update(userRef, {
                bonoRetirable: FieldValue.increment(-amount),
                retirosTotales: FieldValue.increment(amount),
            });

        } else { // withdrawalType === 'main'
            const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
            const day = ukTime.getDate();
            
            if (![10, 20, 30].includes(day)) {
                throw new Error('Retiros de Saldo de Ganancias disponibles solo los días 10, 20 y 30 de cada mes.');
            }
            
            const newEarnings = await consolidateUserEarnings(user.uid, now, transaction);
            const consolidatedSaldoUSDT = (dbUser.saldoUSDT ?? 0) + newEarnings;
            
            if (amount > consolidatedSaldoUSDT) {
                throw new Error(`Saldo de ganancias insuficiente. Disponible: ${consolidatedSaldoUSDT.toFixed(2)} USDT.`);
            }

            transaction.update(userRef, {
                saldoUSDT: FieldValue.increment(-amount),
                retirosTotales: FieldValue.increment(amount),
            });
        }
        
        const tokenRef = systemDb.collection('retiro_tokens').doc();
        transaction.set(tokenRef, {
          correo: user.email,
          token,
          monto: amount,
          estado: 'pendiente',
          fecha: now.toISOString(),
          uid: user.uid,
          tipoRetiro: withdrawalType,
          fechaUK: now.toLocaleString('en-GB', { timeZone: 'Europe/London' }),
        });
    });

    return { success: true, token };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Error creating withdrawal token:', error);
    return { error: error.message || 'Ocurrió un error inesperado al generar el token.' };
  }
}

export async function claimAndFinalizeCycle(userId: string): Promise<{success: true, message: string} | {success: false, error: string}> {
  if (!userId) {
    return { success: false, error: 'ID de usuario no proporcionado.' };
  }

  const userRef = systemDb.collection('users').doc(userId);

  try {
    const resultMessage = await systemDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error('Usuario no encontrado.');
      }
      
      const now = new Date();
      await consolidateUserEarnings(userId, now, transaction);
      
      const investmentsRef = userRef.collection('investments');
      const activeInvestmentsSnap = await transaction.get(investmentsRef.where('status', '==', 'active'));

      if (activeInvestmentsSnap.empty) {
          throw new Error('No hay inversiones activas para finalizar.');
      }

      let totalInvestedValue = 0;
      for(const doc of activeInvestmentsSnap.docs) {
          const inv = doc.data();
          totalInvestedValue += inv.amount;
          transaction.update(doc.ref, { status: 'completed' });
      }

      transaction.update(userRef, {
        totalInvested: 0
      });
      
      const transactionRef = userRef.collection('transacciones').doc();
      transaction.set(transactionRef, {
        fecha: now.toISOString(),
        tipo: 'Ciclo Finalizado',
        descripcion: `Ciclos por un total de ${totalInvestedValue.toFixed(2)} USDT completados.`,
        monto: 0,
      });

      return '¡Ciclo completado con éxito! Todos los planes han sido finalizados.';
    });

    return { success: true, message: resultMessage };

  } catch (error: any) {
    console.error(`Error en claimAndFinalizeCycle para el usuario ${userId}:`, error.message);
    return { success: false, error: `Error del Servidor: ${error.message}` };
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
  
    const now = new Date();
  
    try {
        await systemDb.runTransaction(async (transaction) => {
            const userSnap = await transaction.get(systemDb.collection('users').doc(userId));
            if (!userSnap.exists) {
              console.warn(`[reconcileAccount] User with ID ${userId} not found. Skipping reconciliation.`);
              return; 
            }
            await consolidateUserEarnings(userId, now, transaction);
        });
        
        return { success: true, message: 'La cuenta ha sido auditada y sincronizada.' };
  
    } catch (error: any) {
        if (error.code === 5) { // 5 = gRPC status code for NOT_FOUND
            console.warn(`[reconcileAccount] User ${userId} was not found during final update, possibly deleted mid-reconciliation. Skipping.`);
            return { success: true, message: 'User was deleted during reconciliation; process skipped.' };
        }
        console.error(`Error en reconcileAccount para el usuario ${userId}:`, error.message);
        return { error: `Error del Servidor durante la conciliación: ${error.message}` };
    }
}
