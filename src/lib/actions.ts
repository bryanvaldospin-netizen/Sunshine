'use server';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  addDoc,
  getDoc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { z } from 'zod';
import type { UserProfile } from '@/types';

// USER ACTIONS
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  inviteCode: z.string().min(1, 'El código de invitación no puede estar vacío.'),
});

export async function registerUser(values: z.infer<typeof registerSchema>) {
  try {
    const validatedValues = registerSchema.parse(values);
    const { email, password, name, inviteCode } = validatedValues;

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name,
      email,
      rol: 'user',
      saldoUSDT: 0,
      invitadoPor: null,
      inviteCode: inviteCode,
    });
    
    console.log(`Código ${inviteCode} asignado exitosamente al usuario ${user.uid}`);

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
  const userId = formData.get('userId') as string;
  const userName = formData.get('userName') as string;
  
  if (!userId || !userName) {
    return { error: 'Usuario no autenticado. Por favor, inicia sesión de nuevo.' };
  }

  try {
    const amount = Number(formData.get('amount'));
    const proofFile = formData.get('proof') as File;
    const planName = formData.get('planName') as string;

    if (!amount || !proofFile) {
      return { error: 'Faltan datos en la solicitud (monto o comprobante).' };
    }
     if (!planName) {
      return { error: 'No se ha especificado un nombre de plan.' };
    }
    
    const uniqueFileName = `${Date.now()}_${proofFile.name}`;
    const filePath = `comprobantes/${userId}/${uniqueFileName}`;
    const storageRef = ref(storage, filePath);

    const uploadResult = await uploadBytes(storageRef, proofFile, {
      contentType: proofFile.type,
    });
    
    const comprobanteURL = await getDownloadURL(uploadResult.ref);
    
    if (!comprobanteURL) {
      return { error: 'Error al obtener el enlace de la imagen. Intenta de nuevo.' };
    }

    const newDeposit = {
      userId,
      userName,
      amount,
      comprobanteURL,
      date: new Date().toISOString(),
      status: 'Pendiente',
      planName,
    };
    
    // Create the document in deposit_requests
    const depositDocRef = await addDoc(collection(db, 'deposit_requests'), newDeposit);
    
    // Now create the same document in the user's subcollection
    await setDoc(doc(db, 'users', userId, 'deposit_requests', depositDocRef.id), newDeposit);


    return { success: true };
  } catch (error: any) {
    console.error('Error detallado en submitDeposit:', error);
    let errorMessage = 'Ocurrió un error inesperado al procesar tu depósito.';
    switch (error.code) {
        case 'storage/unauthorized':
            errorMessage = 'Error de Autenticación: No tienes permiso para subir archivos. Verifica que las reglas de Storage y la configuración de CORS son correctas.';
            break;
        case 'storage/canceled':
            errorMessage = 'Error de Red: La subida fue cancelada. Revisa tu conexión.';
            break;
        case 'storage/unknown':
            errorMessage = "Error Desconocido de Storage: La configuración de CORS puede tardar en aplicarse o el nombre del archivo puede ser inválido. Inténtalo de nuevo en unos minutos.";
            break;
        case 'storage/object-not-found':
             errorMessage = "Error de Archivo: No se encontró el objeto en Storage. El bucket puede no estar configurado correctamente.";
             break;
        default:
             errorMessage = `Error Inesperado: ${error.message}`;
             break;
    }
    return { error: errorMessage };
  }
}

// ADMIN ACTIONS
export async function updateUserBalance(userId: string, newBalance: number) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { saldoUSDT: newBalance });
    return { success: true };
  } catch (error: any) {
    return { error: 'No se pudo actualizar el saldo del usuario.' };
  }
}

export async function approveDeposit(depositId: string, userId: string, amount: number) {
  try {
    const userRef = doc(db, 'users', userId);
    const depositRef = doc(db, 'deposit_requests', depositId);
    const userSubCollectionDepositRef = doc(db, 'users', userId, 'deposit_requests', depositId);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error('El usuario no existe.');
      }

      const currentBalance = userDoc.data().saldoUSDT || 0;
      const newBalance = currentBalance + amount;

      transaction.update(userRef, { saldoUSDT: newBalance });
      transaction.update(depositRef, { status: 'Aprobado' });
      
      // Also update the subcollection document
      transaction.update(userSubCollectionDepositRef, { status: 'Aprobado' });

    });

    return { success: true };
  } catch (error: any) {
    console.error('Error al aprobar depósito:', error);
    return { error: error.message };
  }
}

export async function rejectDeposit(depositId: string) {
   try {
    // This needs to find the deposit document to get the userId to update the subcollection
    const depositRef = doc(db, 'deposit_requests', depositId);
    const depositSnap = await getDoc(depositRef);

    if (!depositSnap.exists()) {
        throw new Error("No se encontró la solicitud de depósito.");
    }

    const userId = depositSnap.data().userId;
    const userSubCollectionDepositRef = doc(db, 'users', userId, 'deposit_requests', depositId);

    // Update both documents
    await updateDoc(depositRef, { status: 'Rechazado' });
    await updateDoc(userSubCollectionDepositRef, { status: 'Rechazado' });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error al rechazar depósito:', error);
    return { error: error.message };
  }
}
