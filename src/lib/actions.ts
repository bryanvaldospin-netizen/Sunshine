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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { z } from 'zod';

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

    await addDoc(collection(db, 'deposit_requests'), {
      userId,
      userName,
      amount,
      comprobanteURL,
      date: new Date().toISOString(),
      status: 'Pendiente',
      planName,
    });

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
