'use server';

import { z } from 'zod';
import type { UserProfile } from '@/types';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This gives the server-side actions privileged access to bypass security rules.
// It assumes service account credentials are in the environment, a standard secure practice.
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;
    
    admin.initializeApp({
      credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
      projectId: 'studio-2504766329-6c1a7',
    });
  } catch (e: any) {
    console.error("Failed to initialize firebase-admin:", e.message);
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

export async function registerUser(values: z.infer<typeof registerSchema>): Promise<{success: true, token: string} | {error: string}> {
  try {
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

    const customToken = await adminAuth.createCustomToken(user.uid);
    
    return { success: true, token: customToken };
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
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
  const sponsorRef = adminDb.collection('users').doc(sponsorId);

  try {
    await adminDb.runTransaction(async (transaction) => {
      const referralSnap = await transaction.get(referralRef);
      if (!referralSnap.exists) {
        throw new Error('El usuario referido no existe.');
      }
      const referralData = referralSnap.data() as UserProfile;

      // Security Check: Is the requester the actual sponsor?
      if (referralData.invitadoPor !== sponsorId) {
        throw new Error('No tienes permiso para reclamar este bono.');
      }

      // Security Check: Is there an active plan?
      if (!referralData.planActivo || referralData.planActivo <= 0) {
        throw new Error('El referido no tiene un plan de inversión activo.');
      }

      // CRUCIAL Security Check: Can this bonus be claimed? It must be `true`.
      if (referralData.bonoEntregado !== true) {
        throw new Error('Este bono no está listo para ser reclamado o ya fue pagado.');
      }
    
      const commission = referralData.planActivo * 0.10;

      const sponsorSnap = await transaction.get(sponsorRef);
      if (!sponsorSnap.exists) {
        throw new Error('El patrocinador no fue encontrado durante la transacción.');
      }
      
      // Update sponsor with the commission
      transaction.update(sponsorRef, {
        bonoDirecto: admin.firestore.FieldValue.increment(commission),
        saldoUSDT: admin.firestore.FieldValue.increment(commission),
      });

      // Update referral to mark bonus as 'reclamado'
      transaction.update(referralRef, { bonoEntregado: 'reclamado' });
    });

    return { success: true, message: '¡Bono de 10% reclamado con éxito!' };

  } catch (error: any) {
    console.error(`Error en processInitialBonus para el referido ${referralId}:`, error.message);
    
    return { error: `Error del Servidor: Revisa el cuadro de estatus en Mi Red.` };
  }
}