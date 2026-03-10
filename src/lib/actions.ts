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
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { z } from 'zod';

// USER ACTIONS
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  sponsorCode: z.string().optional(),
  inviteCode: z.string().min(1, 'Debes crear tu propio código de invitación.'),
  walletAddress: z.string().min(20, 'La dirección de la billetera no es válida.'),
});

export async function registerUser(values: z.infer<typeof registerSchema>) {
  try {
    const validatedValues = registerSchema.parse(values);
    const { email, password, name, inviteCode, walletAddress, sponsorCode } = validatedValues;
    
    // Securely check for wallet uniqueness in the new dedicated collection
    const walletRef = doc(db, 'wallet_addresses', walletAddress);
    const walletSnap = await getDoc(walletRef);
    if (walletSnap.exists()) {
      return { error: 'Error: Esta billetera ya está vinculada a otra cuenta. Usa una dirección única.' };
    }

    // Check if the user's desired invite code already exists
    const inviteCodeQuery = query(collection(db, 'users'), where('inviteCode', '==', inviteCode), limit(1));
    const inviteCodeSnap = await getDocs(inviteCodeQuery);
    if (!inviteCodeSnap.empty) {
        return { error: 'Error: Ese código de invitación ya está en uso. Por favor, elige otro.' };
    }

    // Find sponsor if sponsorCode is provided
    let invitadoPor = null;
    if (sponsorCode) {
      console.log('Buscando patrocinador:', sponsorCode);
      const sponsorQuery = query(collection(db, 'users'), where('inviteCode', '==', sponsorCode), limit(1));
      const sponsorSnap = await getDocs(sponsorQuery);
      if (sponsorSnap.empty) {
        return { error: 'El código de patrocinador no existe' };
      }
      const sponsorDoc = sponsorSnap.docs[0];
      invitadoPor = sponsorDoc.id; // The sponsor's UID
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Use a batch to write both user profile and wallet address documents atomically
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
      ultimoCheckIn: null, // Initialize daily bonus field
      planActivo: 0,
      fechaInicioPlan: null,
    });

    const newWalletRef = doc(db, 'wallet_addresses', walletAddress);
    batch.set(newWalletRef, {
        userId: user.uid,
        createdAt: new Date().toISOString()
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

    