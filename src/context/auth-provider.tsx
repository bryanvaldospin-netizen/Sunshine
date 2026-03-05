'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
});

const generateInviteCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).then(() => {
      
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            // El usuario acaba de iniciar sesión a través de una redirección.
            // El observador onAuthStateChanged se encargará del resto.
          }
        })
        .catch((error) => {
          console.error("Error al obtener el resultado de la redirección:", error);
        });

      let unsubscribeFromSnapshot: () => void = () => {};

      const unsubscribeFromAuth = onAuthStateChanged(auth, (currentFirebaseUser) => {
        unsubscribeFromSnapshot(); // Limpia la suscripción anterior a Firestore.

        if (currentFirebaseUser) {
          setFirebaseUser(currentFirebaseUser);
          const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
          
          unsubscribeFromSnapshot = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as UserProfile;
              
              if (!userData.inviteCode) {
                // Si falta el código, genéralo y guárdalo.
                try {
                  const newInviteCode = generateInviteCode();
                  console.log('Código de invitación generado y guardado');
                  await updateDoc(userDocRef, { inviteCode: newInviteCode });
                  // El listener de onSnapshot se volverá a ejecutar con el documento actualizado,
                  // por lo que no llamamos a setUser aquí para evitar un parpadeo con datos antiguos.
                } catch (e) {
                  console.error("No se pudo agregar el código de invitación:", e);
                  setUser(userData); // Establece el usuario incluso si la actualización falla.
                  setLoading(false);
                }
              } else {
                // Si el código existe, los datos del usuario están completos.
                setUser(userData);
                setLoading(false);
              }
            } else {
              // Si el usuario existe en Auth pero no en Firestore, lo creamos.
              const newUserProfile: UserProfile = {
                  uid: currentFirebaseUser.uid,
                  email: currentFirebaseUser.email!,
                  name: currentFirebaseUser.displayName || 'New User',
                  rol: 'user',
                  saldoUSDT: 0,
                  invitadoPor: null,
                  inviteCode: generateInviteCode(),
              };
              try {
                  console.log('Creando nuevo perfil con código de invitación.');
                  await setDoc(userDocRef, newUserProfile);
                  // onSnapshot será activado por setDoc, así que no es necesario llamar a setUser aquí.
              } catch (error) {
                  console.error("AuthProvider: Error creando perfil de usuario:", error);
                  setUser(null);
                  setLoading(false);
              }
            }
          }, (error) => {
            console.error("AuthProvider: Error al obtener el perfil de usuario:", error);
            setUser(null);
            setLoading(false);
          });
        } else {
          // No hay usuario logueado.
          setUser(null);
          setFirebaseUser(null);
          setLoading(false);
        }
      });

      return () => {
        unsubscribeFromAuth();
        unsubscribeFromSnapshot();
      };
      
    }).catch((error) => {
      console.error("Error al establecer la persistencia de Auth:", error);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
