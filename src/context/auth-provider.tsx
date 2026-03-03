'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence error:", error);
    });

    let unsubscribeFromSnapshot: () => void = () => {};

    const unsubscribeFromAuth = onAuthStateChanged(auth, (currentFirebaseUser) => {
      unsubscribeFromSnapshot();

      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser);

        const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
        
        unsubscribeFromSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setUser(userData);
          } else {
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
                console.error("AuthProvider: Error creating user profile:", error);
                setUser(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("AuthProvider: Error fetching user profile:", error);
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
