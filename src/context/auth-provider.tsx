'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
          
          unsubscribeFromSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUser(docSnap.data() as UserProfile);
            } else {
              // This is an inconsistent state. User exists in Auth but not in Firestore.
              // This can happen if Firestore doc creation fails after Auth user creation,
              // or if a user authenticated with a provider (e.g. Google) without completing a profile.
              // We treat them as not fully logged in by keeping user profile null.
              console.warn(`User ${currentFirebaseUser.uid} is authenticated but has no profile document in Firestore.`);
              setUser(null);
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
