'use server';

import { z } from 'zod';
import type { UserProfile } from '@/types';
import * as system from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';


// Initialize Firebase Admin SDK with explicit project ID
// This gives the server-side actions privileged access to bypass security rules.
if (!system.apps.length) {
    try {
        system.initializeApp({
            projectId: "studio-2504766329-6c1a7",
        });
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
      retirosTotales: 0,
      invitadoPor: invitadoPor,
      inviteCode: inviteCode,
      walletAddress: walletAddress,
      ultimoCheckIn: null,
      planActivo: 0,
      inversionAnterior: 0,
      fechaInicioPlan: null,
      bonoDirecto: 0,
      bonoRetirable: 0,
      bonoEntregado: false,
      fechaRegistro: new Date().toISOString(),
      estadoPlan: 'activo',
      lastConsolidation: null,
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

    // After successful user creation, try to add the welcome transaction.
    // This part is non-critical and won't block the registration if it fails.
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
        // We log the error but don't fail the entire registration process.
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

export async function getWalletAddress() {
  return "0x471d4424e1016a256a8d13283522302cb020a4d2";
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

      // Audit and correct referral bonus
      const retirable = (userData.bonoDirecto ?? 0) - (userData.retirosTotales ?? 0);
      if (userData.bonoRetirable !== retirable) {
        userUpdate.bonoRetirable = retirable;
      }
      
      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoDirecto')) {
        userUpdate.bonoDirecto = 0;
      }
      if (!Object.prototype.hasOwnProperty.call(userData, 'bonoEntregado')) {
        userUpdate.bonoEntregado = false;
      }
      if (!Object.prototype.hasOwnProperty.call(userData, 'retirosTotales')) {
        userUpdate.retirosTotales = 0;
      }


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

      if (referralData.invitadoPor !== sponsorId) throw new Error('No tienes permiso para reclamar este bono.');
      if (referralData.bonoEntregado !== true) throw new Error('Este bono no está listo para ser reclamado o ya fue procesado.');
      
      const sponsorSnap = await transaction.get(sponsorRef);
      if (!sponsorSnap.exists) throw new Error('El patrocinador no fue encontrado.');
      const sponsorData = sponsorSnap.data() as UserProfile;
      
      const sponsorPlan = sponsorData.planActivo ?? 0;
      if (sponsorPlan <= 0) {
          return 'Bono no pagado: El patrocinador necesita un plan activo para recibir comisiones.';
      }
      
      const investmentDifference = (referralData.planActivo ?? 0) - (referralData.inversionAnterior ?? 0);
      if (investmentDifference <= 0) {
          return 'No hay nueva inversión para comisionar.';
      }

      const potentialCommission = investmentDifference * 0.10;
      const sponsorBonos = sponsorData.bonoDirecto ?? 0;
      const sponsorMaxBonus = sponsorPlan * 3;

      if (sponsorBonos >= sponsorMaxBonus) {
          transaction.update(referralRef, { 
              bonoEntregado: 'reclamado',
              inversionAnterior: referralData.planActivo ?? 0
          });
          return 'Límite de ganancias del patrocinador (300%) alcanzado. El bono no fue entregado.';
      }

      const availableRoom = sponsorMaxBonus - sponsorBonos;
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
          
          if (payableCommission < potentialCommission) {
              message = `Bono parcial de ${payableCommission.toFixed(2)} USDT reclamado. Patrocinador alcanzó el límite del 300%.`;
          } else {
              message = `¡Bono de ${payableCommission.toFixed(2)} USDT reclamado con éxito!`;
          }
      } else {
          message = 'El bono no pudo ser pagado porque el patrocinador no tenía margen de ganancia.';
      }

      transaction.update(referralRef, { 
          bonoEntregado: 'reclamado',
          inversionAnterior: referralData.planActivo ?? 0
      });

      return message;
    });

    return { success: true, message: resultMessage };

  } catch (error: any) {
    console.error(`Error en processInitialBonus para el referido ${referralId}:`, error.message);
    return { error: `Error del Servidor: ${error.message}` };
  }
}

export async function createInvestmentTransaction(userId: string, newPlanAmount: number, oldPlanAmount: number): Promise<{success: true} | {error: string}> {
  if (!userId) {
    return { error: 'User ID is missing.' };
  }
  
  const investmentAmount = newPlanAmount - oldPlanAmount;
  if (investmentAmount <= 0) {
    // This isn't an error, just no new investment to log.
    return { success: true };
  }
  
  try {
    const userTransactionRef = systemDb.collection('users').doc(userId).collection('transacciones').doc();
    
    await userTransactionRef.set({
      fecha: new Date().toISOString(),
      tipo: 'Activación de Plan',
      descripcion: `Inversión de ${investmentAmount.toFixed(2)} USDT`,
      monto: investmentAmount
    });
    
    return { success: true };

  } catch (error: any) {
    console.error(`Error creating investment transaction for user ${userId}:`, error);
    // Don't bubble up as a critical error to the client, just log it.
    return { error: `Server Error: ${error.message}` };
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

const getDailyRate = (planAmount: number): number => {
    if (planAmount >= 1001) return 0.025;
    if (planAmount >= 501) return 0.020;
    if (planAmount >= 101) return 0.018;
    if (planAmount >= 20) return 0.015;
    return 0;
};

async function calculateProgressiveEarnings(db: system.firestore.Firestore, user: UserProfile, consolidationTime: Date): Promise<number> {
    let totalEarned = 0;
    const lastConsolidationDate = user.lastConsolidation ? new Date(user.lastConsolidation) : new Date(user.fechaRegistro || consolidationTime);

    // 1. Consolidate ROI
    const planActivo = user.planActivo ?? 0;
    if (planActivo > 0 && user.fechaInicioPlan && user.estadoPlan === 'activo') {
        const startDate = new Date(user.fechaInicioPlan);
        const calculationStartDate = startDate > lastConsolidationDate ? startDate : lastConsolidationDate;
        const diffTime = consolidationTime.getTime() - calculationStartDate.getTime();
        if (diffTime > 0) {
            const diffDays = Math.floor((diffTime / (1000 * 60 * 60 * 24)) + 1e-9);
            if (diffDays > 0) {
                const dailyRate = getDailyRate(planActivo);
                const earnedROI = planActivo * dailyRate * diffDays;
                totalEarned += earnedROI;
            }
        }
    }

    // 2. Consolidate Primary Residual Bonus
    if ((user.planActivo ?? 0) >= 101) {
        const referralsSnapshot = await db.collection('users').where('invitadoPor', '==', user.uid).get();
        if (!referralsSnapshot.empty) {
            let residualBonus = 0;
            referralsSnapshot.forEach(refDoc => {
                const refData = refDoc.data() as UserProfile;
                if ((refData.planActivo ?? 0) >= 20 && refData.estadoPlan !== 'vencido' && refData.fechaInicioPlan) {
                    const refStartDate = new Date(refData.fechaInicioPlan);
                    const calculationStartDate = refStartDate > lastConsolidationDate ? refStartDate : lastConsolidationDate;
                    const diffTime = consolidationTime.getTime() - calculationStartDate.getTime();
                    if (diffTime > 0) {
                        const diffDays = Math.floor((diffTime / (1000 * 60 * 60 * 24)) + 1e-9);
                        if (diffDays > 0) {
                            const dailyBonus = (refData.planActivo ?? 0) * 0.01;
                            residualBonus += dailyBonus * diffDays;
                        }
                    }
                }
            });
            totalEarned += residualBonus;
        }
    }
    return totalEarned;
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
        
        let tipoRetiroForDb: 'bono_referido' | 'saldo_actual';
        
        if (withdrawalType === 'referral') {
            tipoRetiroForDb = 'bono_referido';
            const bonoRetirable = dbUser.bonoRetirable ?? 0;
            if (amount > bonoRetirable) {
                throw new Error(`Saldo de bono insuficiente. Disponible: ${bonoRetirable.toFixed(2)} USDT.`);
            }
            
            transaction.update(userRef, {
                bonoRetirable: FieldValue.increment(-amount),
                retirosTotales: FieldValue.increment(amount),
            });

        } else { // withdrawalType === 'main'
            tipoRetiroForDb = 'saldo_actual';
            const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
            const day = ukTime.getDate();
            const hour = ukTime.getHours();
            
            const isWithdrawalDay = [10, 20, 30].includes(day);
            const isWithdrawalTime = hour >= 6;

            if (!isWithdrawalDay || !isWithdrawalTime) {
                throw new Error('Retiros de Saldo Actual disponibles solo los días 10, 20 y 30, a partir de las 6:00 AM (Hora de Londres).');
            }
            
            const earnedAmount = await calculateProgressiveEarnings(systemDb, dbUser, now);
            
            transaction.update(userRef, {
                saldoUSDT: FieldValue.increment(earnedAmount),
                lastConsolidation: now.toISOString(),
            });
            
            const consolidatedSaldoUSDT = (dbUser.saldoUSDT ?? 0) + earnedAmount;
            
            if (amount > consolidatedSaldoUSDT) {
                throw new Error(`Saldo actual insuficiente. Disponible: ${consolidatedSaldoUSDT.toFixed(2)} USDT.`);
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
          fecha: FieldValue.serverTimestamp(),
          uid: user.uid,
          tipoRetiro: tipoRetiroForDb,
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
      const userData = userSnap.data() as UserProfile;

      const planActivo = userData.planActivo ?? 0;
      if (planActivo <= 0) {
        throw new Error('No hay un plan activo para reclamar.');
      }
      
      if (userData.estadoPlan === 'vencido') {
        throw new Error('Este ciclo ya ha sido reclamado y está vencido.');
      }

      // --- Final Consolidation ---
      const now = new Date();
      const finalEarnings = await calculateProgressiveEarnings(systemDb, userData, now);

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 3);

      transaction.update(userRef, {
        saldoUSDT: FieldValue.increment(finalEarnings),
        planActivo: 0,
        inversionAnterior: 0,
        fechaInicioPlan: null,
        estadoPlan: 'vencido',
        fechaVencimiento: expirationDate.toISOString(),
        lastConsolidation: now.toISOString(),
      });
      
      const transactionRef = userRef.collection('transacciones').doc();
       transaction.set(transactionRef, {
        fecha: new Date().toISOString(),
        tipo: 'Ciclo Finalizado',
        descripcion: `Ciclo de ${planActivo} USDT completado. Cuenta congelada.`,
        monto: 0,
      });

      return '¡Ciclo completado con éxito! El plan ha sido finalizado.';
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
        // Manually map to a plain object to ensure serialization.
        return {
          uid: doc.id,
          name: data.name || '',
          email: data.email || '',
          planActivo: data.planActivo ?? 0,
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

  const userRef = systemDb.collection('users').doc(userId);
  const now = new Date();

  try {
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        throw new Error('Usuario no encontrado.');
      }
      const userData = userSnap.data() as UserProfile;

      // Full audit calculation from the beginning
      const planActivo = userData.planActivo ?? 0;
      let totalAuditedEarnings = 0;
      
      // 1. Calculate ROI
      if (planActivo > 0 && userData.fechaInicioPlan && userData.estadoPlan !== 'vencido') {
          const startDate = new Date(userData.fechaInicioPlan);
          const diffTime = now.getTime() - startDate.getTime();
          const daysCalculated = Math.floor((diffTime / (1000 * 60 * 60 * 24)) + 1e-9);
          console.log(`[AUDIT-ROI] Days calculated for ROI: ${daysCalculated}`);
          
          if (daysCalculated > 0) {
              const dailyRate = getDailyRate(planActivo);
              const rawROI = planActivo * dailyRate * daysCalculated;
              console.log(`[AUDIT-ROI] Raw ROI calculated: ${rawROI}`);
              totalAuditedEarnings += rawROI;
          }
      }
      
      // 2. Calculate Residual
      if ((userData.planActivo ?? 0) >= 101) {
          const referralsSnapshot = await systemDb.collection('users').where('invitadoPor', '==', userData.uid).get();
          if (!referralsSnapshot.empty) {
              let residualBonus = 0;
              referralsSnapshot.forEach(refDoc => {
                  const refData = refDoc.data() as UserProfile;
                  if ((refData.planActivo ?? 0) >= 20 && refData.estadoPlan !== 'vencido' && refData.fechaInicioPlan) {
                      const refStartDate = new Date(refData.fechaInicioPlan);
                      const diffTime = now.getTime() - refStartDate.getTime();
                      const diffDays = Math.floor((diffTime / (1000 * 60 * 60 * 24)) + 1e-9);
                      if (diffDays > 0) {
                          const dailyBonus = (refData.planActivo ?? 0) * 0.01;
                          residualBonus += dailyBonus * diffDays;
                      }
                  }
              });
              console.log(`[AUDIT-RESIDUAL] Residual sum calculated: ${residualBonus}`);
              totalAuditedEarnings += residualBonus;
          }
      }

      const finalAuditedBalance = parseFloat(totalAuditedEarnings.toFixed(2));
      console.log(`[AUDIT-FINAL] Final write value for saldoUSDT: ${finalAuditedBalance}`);

      // Overwrite if different
      if (userData.saldoUSDT !== finalAuditedBalance) {
        await userRef.update({
          saldoUSDT: finalAuditedBalance,
        });
        return { success: true, message: `Cuenta auditada. Saldo corregido de ${userData.saldoUSDT} a ${finalAuditedBalance.toFixed(2)} USDT.` };
      }

      return { success: true, message: 'La cuenta ya estaba sincronizada.' };

  } catch (error: any) {
    console.error(`Error en reconcileAccount para el usuario ${userId}:`, error.message);
    return { error: `Error del Servidor durante la conciliación: ${error.message}` };
  }
}

export async function getUserStats(): Promise<{ totalUsers: number; inactiveCount: number; } | { error: string; }> {
  try {
    const usersSnapshot = await systemDb.collection('users').get();
    const totalUsers = usersSnapshot.size;

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const inactiveUsersQuery = systemDb.collection('users').where('planActivo', '==', 0);
    const inactiveSnapshot = await inactiveUsersQuery.get();
    
    let inactiveCount = 0;
    inactiveSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fechaRegistro) {
        const registrationDate = new Date(userData.fechaRegistro);
        if (registrationDate < tenDaysAgo) {
          inactiveCount++;
        }
      }
    });

    return { totalUsers, inactiveCount };
  } catch (error: any) {
    console.error('Error getting user stats:', error);
    return { error: 'No se pudieron obtener las estadísticas de los usuarios.' };
  }
}
