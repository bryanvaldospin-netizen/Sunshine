'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
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

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
        unsubscribeFromSnapshot(); 
        setLoading(true); // Always enter loading state when auth state changes.

        if (currentFirebaseUser) {
          setFirebaseUser(currentFirebaseUser);
          const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
          
          unsubscribeFromSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as UserProfile;
              console.log('Datos del usuario desde Firestore:', userData);
              setUser(userData);
            } else {
              console.warn(`User ${currentFirebaseUser.uid} is authenticated but has no profile document in Firestore.`);
              setUser(null);
            }
            setLoading(false);
          }, (error) => {
            console.error('Error de Firestore al leer perfil:', error);
            setUser(null);
            setLoading(false);
          });
        } else {
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
