'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Primero, intenta establecer la persistencia.
    setPersistence(auth, browserLocalPersistence).then(() => {
      
      // Segundo, maneja el resultado de una redirección de inicio de sesión (ej. Google)
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

      // Tercero, establece el observador principal del estado de autenticación.
      const unsubscribeFromAuth = onAuthStateChanged(auth, (currentFirebaseUser) => {
        unsubscribeFromSnapshot(); // Limpia la suscripción anterior a Firestore.

        if (currentFirebaseUser) {
          setFirebaseUser(currentFirebaseUser);
          const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
          
          unsubscribeFromSnapshot = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              setUser(docSnap.data() as UserProfile);
            } else {
              // Si el usuario existe en Auth pero no en Firestore, lo creamos.
              const newUserProfile: UserProfile = {
                  uid: currentFirebaseUser.uid,
                  email: currentFirebaseUser.email!,
                  name: currentFirebaseUser.displayName || 'New User',
                  rol: 'user',
                  saldoUSDT: 0,
                  invitadoPor: null,
              };
              try {
                  await setDoc(userDocRef, newUserProfile);
                  setUser(newUserProfile);
              } catch (error) {
                  console.error("AuthProvider: Error creando perfil de usuario:", error);
                  setUser(null);
              }
            }
            setLoading(false);
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
