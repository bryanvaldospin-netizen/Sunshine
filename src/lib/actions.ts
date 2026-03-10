'use server';

import { z } from 'zod';
import type { UserProfile } from '@/types';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This gives the server-side actions privileged access to bypass security rules.
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (error) {
        console.error("Firebase Admin initialization error:", error);
    }
}
const adminDb = admin.firestore();
const adminAuth = admin.auth();


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
     if (!admin.apps.length || !adminDb) {
        throw new Error('La conexión con el servidor de autenticación falló.');
    }

    const validatedValues = registerSchema.parse(values);
    const { email, password, name, walletAddress, sponsorCode } = validatedValues;
    
    const walletRef = adminDb.collection('wallet_addresses').doc(walletAddress);
    const walletSnap = await walletRef.get();
    if (walletSnap.exists) {
      return { error: 'Error: Esta billetera ya está vinculada a otra cuenta. Usa una dirección única.' };
    }

    let invitadoPor: string | null = null;
    if (sponsorCode) {
      const sponsorCodeRef = adminDb.collection('invite_codes_map').doc(sponsorCode.trim());
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
            const codeRef = adminDb.collection('invite_codes_map').doc(code);
            const codeSnap = await codeRef.get();
            if (!codeSnap.exists) {
                isUnique = true;
            }
        }
        return code!;
    };

    const inviteCode = await generateUniqueInviteCode();
    
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    const user = userRecord;

    const batch = adminDb.batch();
    
    const userDocRef = adminDb.collection('users').doc(user.uid);
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
      inversionAnterior: 0,
      fechaInicioPlan: null,
      bonoDirecto: 0,
      bonoEntregado: false,
      fechaRegistro: new Date().toISOString(),
    });

    const newWalletRef = adminDb.collection('wallet_addresses').doc(walletAddress);
    batch.set(newWalletRef, {
        userId: user.uid,
        createdAt: new Date().toISOString()
    });
    
    const userInviteCodeRef = adminDb.collection('invite_codes_map').doc(inviteCode);
    batch.set(userInviteCodeRef, {
        userId: user.uid
    });

    await batch.commit();

    try {
        const customToken = await adminAuth.createCustomToken(user.uid);
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
  return process.env.USDT_WALLET_ADDRESS || '0xe37a298c740caf1411cbccda7b250a0664a00129';
}

export async function syncInviteCodes() {
  try {
    const usersCollectionRef = adminDb.collection('users');
    const usersSnapshot = await usersCollectionRef.get();

    if (usersSnapshot.empty) {
      return { success: true, message: 'No se encontraron usuarios para sincronizar.' };
    }

    const batch = adminDb.batch();
    let syncedCodesCount = 0;
    let updatedUsersCount = 0;
    let bonoEntregadoCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      if (userData.inviteCode && typeof userData.inviteCode === 'string') {
        const inviteCode = userData.inviteCode;
        const inviteCodeMapRef = adminDb.collection('invite_codes_map').doc(inviteCode);
        const inviteCodeMapSnap = await inviteCodeMapRef.get();
        if (!inviteCodeMapSnap.exists) {
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

export async function processInitialBonus(referralId: string, sponsorId: string): Promise<{success: true, message: string} | {error: string}> {
  if (!referralId || !sponsorId) {
    return { error: 'Faltan IDs de referido o patrocinador.' };
  }

  const referralRef = adminDb.collection('users').doc(referralId);
  const sponsorRef = adminDb.collection('users').doc(sponsorId.trim());

  try {
    const resultMessage = await adminDb.runTransaction(async (transaction) => {
      const referralSnap = await transaction.get(referralRef);
      if (!referralSnap.exists) throw new Error('El usuario referido no existe.');
      const referralData = referralSnap.data() as UserProfile;

      if (referralData.invitadoPor !== sponsorId) throw new Error('No tienes permiso para reclamar este bono.');
      if (referralData.bonoEntregado !== true) throw new Error('Este bono no está listo para ser reclamado o ya fue pagado.');
      
      const sponsorSnap = await transaction.get(sponsorRef);
      if (!sponsorSnap.exists) throw new Error('El patrocinador no fue encontrado.');
      const sponsorData = sponsorSnap.data() as UserProfile;
      
      const planActivo = referralData.planActivo ?? 0;
      const inversionAnterior = referralData.inversionAnterior ?? 0;
      
      let message = '¡Bono de 10% reclamado con éxito!';

      if (planActivo > inversionAnterior) {
        const investmentDifference = planActivo - inversionAnterior;
        const commission = investmentDifference * 0.10;

        const sponsorPlan = sponsorData.planActivo ?? 0;
        const sponsorBonos = sponsorData.bonoDirecto ?? 0;
        const sponsorMaxBonus = sponsorPlan * 3;
        
        if (sponsorPlan > 0 && (sponsorBonos + commission <= sponsorMaxBonus)) {
          transaction.update(sponsorRef, {
            bonoDirecto: admin.firestore.FieldValue.increment(commission),
            saldoUSDT: admin.firestore.FieldValue.increment(commission),
          });
          
          const sponsorTransactionRef = sponsorRef.collection('transacciones').doc();
          transaction.set(sponsorTransactionRef, {
              fecha: new Date().toISOString(),
              tipo: 'Bono Directo',
              descripcion: `Comisión por inversión de ${referralData.name}`,
              monto: commission
          });
        } else {
            message = 'Bono procesado, pero comisión no pagada: Patrocinador alcanzó límite del 300% o no tiene plan activo.';
        }
      }
      
      transaction.update(referralRef, { 
        bonoEntregado: 'reclamado',
        inversionAnterior: planActivo
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
    const userTransactionRef = adminDb.collection('users').doc(userId).collection('transacciones').doc();
    
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
