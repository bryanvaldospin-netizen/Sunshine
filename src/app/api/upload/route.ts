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
        return NextResponse.json({ error: 'Usuario no autenticado. Por favor, inicia sesión de nuevo.' }, { status: 401 });
    }
    if (!amount || !proofFile || !planName) {
        return NextResponse.json({ error: 'Faltan datos en la solicitud (monto, comprobante o plan).' }, { status: 400 });
    }
    
    // Create a unique file name
    const extension = proofFile.name.split('.').pop() || 'jpg';
    const uniqueFileName = `comprobante_${userId}_${Date.now()}.${extension}`;
    const filePath = `comprobantes/${userId}/${uniqueFileName}`;
    const storageRef = ref(storage, filePath);

    // Convert file to buffer to upload from server
    const fileBuffer = await proofFile.arrayBuffer();
    
    // Upload using uploadBytes
    const uploadResult = await uploadBytes(storageRef, fileBuffer, {
      contentType: proofFile.type,
    });
    
    const comprobanteURL = await getDownloadURL(uploadResult.ref);

    if (!comprobanteURL) {
        return NextResponse.json({ error: 'Error al obtener el enlace de la imagen. Intenta de nuevo.' }, { status: 500 });
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

    // Create doc in top-level collection to get an ID
    const depositDocRef = await addDoc(collection(db, 'deposit_requests'), newDeposit);
    
    // Create the same doc in the user's subcollection using the same ID
    await setDoc(doc(db, 'users', userId, 'deposit_requests', depositDocRef.id), newDeposit);

    return NextResponse.json({ success: true, depositId: depositDocRef.id }, { status: 200 });

  } catch (error: any) {
    console.error('Error detallado en /api/upload:', error);

    let errorMessage = 'Ocurrió un error inesperado al procesar tu depósito.';
    
    // More specific error handling
    if (error.code) {
        switch (error.code) {
            case 'storage/unauthorized':
                errorMessage = 'Error de Permisos en Storage: El servidor no tiene permiso para subir archivos. Revisa las reglas de Firebase Storage.';
                break;
            case 'permission-denied':
                errorMessage = 'Error de Permisos en Firestore: La solicitud para guardar los datos fue denegada. Revisa las reglas de seguridad de Firestore.';
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
