'use server';

import { NextResponse } from 'next/server';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const userName = formData.get('userName') as string;
    const amount = Number(formData.get('amount'));
    const proofFile = formData.get('proof') as File;
    const planName = formData.get('planName') as string;

    if (!userId || !userName) {
        return NextResponse.json({ error: 'Usuario no autenticado (UID no recibido). Por favor, inicia sesión de nuevo.' }, { status: 401 });
    }
    if (!amount || !proofFile || !planName) {
        return NextResponse.json({ error: 'Faltan datos en la solicitud (monto, comprobante o plan).' }, { status: 400 });
    }
    
    // --- START OF SIMULATION LOGIC ---
    const testContent = 'Prueba de Yareel';
    const testFileName = 'simulacro.txt';
    const filePath = `comprobantes/${userId}/${testFileName}`;
    const storageRef = ref(storage, filePath);

    // Convert string to buffer for upload
    const textBuffer = Buffer.from(testContent, 'utf-8');
    
    // Upload the text file buffer
    const uploadResult = await uploadBytes(storageRef, textBuffer, {
      contentType: 'text/plain',
    });
    // --- END OF SIMULATION LOGIC ---

    const comprobanteURL = await getDownloadURL(uploadResult.ref);

    if (!comprobanteURL) {
        return NextResponse.json({ error: 'Error al obtener el enlace del archivo de prueba. Intenta de nuevo.' }, { status: 500 });
    }
    
    const newDeposit = {
      userId,
      userName,
      amount,
      comprobanteURL, // The URL will be for the simulacro.txt
      date: new Date().toISOString(),
      status: 'Pendiente',
      planName,
    };

    // Create doc in top-level collection to get an ID
    const depositDocRef = await addDoc(collection(db, 'deposit_requests'), newDeposit);
    
    // Create the same doc in the user's subcollection using the same ID
    await setDoc(doc(db, 'users', userId, 'deposit_requests', depositDocRef.id), newDeposit);

    // Return success message indicating it was a test
    return NextResponse.json({ success: true, message: "Simulacro completado. Revisa la carpeta con tu UID en Storage.", depositId: depositDocRef.id }, { status: 200 });

  } catch (error: any) {
    console.error('Error detallado en /api/upload (simulacro):', error);

    let errorMessage = 'Ocurrió un error inesperado al procesar tu depósito de prueba.';
    
    if (error.code) {
        switch (error.code) {
            case 'storage/unauthorized':
                errorMessage = 'Error de Permisos en Storage: El servidor no tiene permiso para subir archivos. Revisa las reglas de Firebase Storage y la configuración CORS del bucket.';
                break;
            case 'storage/unknown':
                errorMessage = 'Error desconocido de Storage. Puede ser un problema con la configuración CORS de tu bucket o un problema de red.';
                break;
            case 'permission-denied':
                errorMessage = 'Error de Permisos en Firestore: La solicitud para guardar los datos fue denegada. El UID del usuario podría ser incorrecto o las reglas no lo permiten.';
                break;
            case 'storage/object-not-found':
                errorMessage = 'Error de Storage: El objeto del archivo no fue encontrado después de la subida.';
                break;
            default:
                 errorMessage = `Error del servidor: ${error.message} (Código: ${error.code})`;
                 break;
        }
    } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
