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
import { redirect } from 'next/navigation';
import * as z from 'zod';

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
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { error: 'Este correo electrónico ya está en uso.' };
    }
    if (error instanceof z.ZodError) {
      return { error: error.errors.map(e => e.message).join(', ') };
    }
    return { error: error.message };
  }

  redirect('/dashboard');
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginUser(values: z.infer<typeof loginSchema>) {
  try {
    const { email, password } = loginSchema.parse(values);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
     if (error.code === 'auth/invalid-credential') {
      return { error: 'Credenciales incorrectas. Por favor, verifica tu email y contraseña.' };
    }
    return { error: error.message };
  }
  redirect('/dashboard');
}

export async function logoutUser() {
  await signOut(auth);
  redirect('/login');
}

export async function getWalletAddress() {
  // In a real app, this would be securely fetched, maybe per-user
  return process.env.USDT_WALLET_ADDRESS || 'TU_BILLETERA_USDT_TRC20_AQUI';
}

export async function submitDeposit(formData: FormData) {
  try {
    const amount = Number(formData.get('amount'));
    const proofFile = formData.get('proof') as File;
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;

    if (!amount || !proofFile || !userId || !userName) {
      throw new Error('Faltan datos en la solicitud.');
    }

    const storageRef = ref(storage, `comprobantes/${userId}/${Date.now()}_${proofFile.name}`);
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
