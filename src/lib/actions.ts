'use server';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  collection,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  codigoInvitacion: z.string().optional(),
});

export async function registerUser(values: z.infer<typeof registerSchema>) {
  try {
    const validatedValues = registerSchema.parse(values);
    const { email, password, codigoInvitacion, name } = validatedValues;

    let invitadoPor: string | null = null;

    if (codigoInvitacion && codigoInvitacion.length > 0) {
      const codeRef = doc(db, 'codigos_invitacion', codigoInvitacion);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists() || codeSnap.data().used) {
        return { error: 'Código de invitación no válido o ya ha sido utilizado.' };
      }
      invitadoPor = codigoInvitacion;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name,
      email,
      rol: 'user',
      saldoUSDT: 0,
      invitadoPor: invitadoPor,
    });

    if (invitadoPor) {
      const codeRef = doc(db, 'codigos_invitacion', invitadoPor);
      await updateDoc(codeRef, {
        used: true,
        usedBy: user.uid,
        usedDate: new Date().toISOString(),
      });
    }
    return { success: true };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { error: 'Este correo electrónico ya está en uso.' };
    }
    if (error instanceof z.ZodError) {
      return { error: error.errors.map(e => e.message).join(', ') };
    }
    return { error: error.message };
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginUser(values: z.infer<typeof loginSchema>) {
  try {
    const { email, password } = loginSchema.parse(values);
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error: any) {
     if (error.code === 'auth/invalid-credential') {
      return { error: 'Credenciales incorrectas. Por favor, verifica tu email y contraseña.' };
    }
    return { error: error.message };
  }
}

export async function logoutUser() {
  await signOut(auth);
  return { success: true };
}

export async function getWalletAddress() {
  return process.env.USDT_WALLET_ADDRESS || '0xe37a298c740caf1411cbccda7b250a0664a00129';
}

export async function submitDeposit(formData: FormData) {
  try {
    const amount = Number(formData.get('amount'));
    const proofFile = formData.get('proof') as File;
    let userId = formData.get('userId') as string;
    let userName = formData.get('userName') as string;

    if (!userId) {
        console.log('Modo Dev: Usando UID Maestro para Sunshine');
        userId = 'XA10iCiKFscyFkcfZnwEfQOWYsB2';
        userName = 'yareelvaldospin@gmail.com';
    }

    if (!amount || !proofFile) {
      throw new Error('Faltan datos en la solicitud (monto o comprobante).');
    }

    const storageRef = ref(storage, `public_test/comprobantes/${Date.now()}_${proofFile.name}`);
    const uploadResult = await uploadBytes(storageRef, proofFile);
    const comprobanteURL = await getDownloadURL(uploadResult.ref);

    await addDoc(collection(db, 'deposit_requests'), {
      userId,
      userName,
      amount,
      comprobanteURL,
      date: new Date().toISOString(),
      status: 'Pendiente',
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

const idSchema = z.object({ requestId: z.string() });

export async function rejectDeposit(values: z.infer<typeof idSchema>) {
  try {
    const { requestId } = idSchema.parse(values);
    const requestRef = doc(db, 'deposit_requests', requestId);
    await updateDoc(requestRef, { status: 'Rechazado' });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

const approveSchema = z.object({
  requestId: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
});

export async function approveDeposit(values: z.infer<typeof approveSchema>) {
    try {
        const { requestId, userId, amount } = approveSchema.parse(values);
        
        await runTransaction(db, async (transaction) => {
            const requestRef = doc(db, 'deposit_requests', requestId);
            const userRef = doc(db, 'users', userId);

            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found");
            }

            const newBalance = (userDoc.data().saldoUSDT || 0) + amount;
            
            transaction.update(userRef, { saldoUSDT: newBalance });
            transaction.update(requestRef, { status: 'Aprobado' });
        });

        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}


const toggleRoleSchema = z.object({
  userId: z.string(),
  currentRole: z.enum(['user', 'admin']),
});

export async function toggleUserRole(values: z.infer<typeof toggleRoleSchema>) {
  try {
    const { userId, currentRole } = toggleRoleSchema.parse(values);
    
    const userRef = doc(db, 'users', userId);
    
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    await updateDoc(userRef, { rol: newRole });
    
    return { success: true, newRole };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors.map(e => e.message).join(', ') };
    }
    return { error: error.message };
  }
}

export async function submitTestDeposit() {
  try {
    // UID provided by user to test the flow. This user must exist in Firestore.
    await addDoc(collection(db, 'deposit_requests'), {
      userId: 'XA10iCiKFscyFkcfZnwEfQOWYsB2',
      userName: 'yareelvaldospin@gmail.com',
      amount: 50,
      comprobanteURL: 'https://picsum.photos/seed/test-receipt/600/400',
      date: new Date().toISOString(),
      status: 'Pendiente',
      planName: 'Nivel 3 (Oro)', // Test field
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting test deposit:", error);
    return { error: error.message };
  }
}
