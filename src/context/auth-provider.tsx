'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
    console.log('AuthProvider: Setting up Firebase auth persistence...');
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence error:", error);
    });

    let unsubscribeFromSnapshot: () => void = () => {};

    const unsubscribeFromAuth = onAuthStateChanged(auth, (currentFirebaseUser) => {
      console.log('AuthProvider: onAuthStateChanged triggered.');
      // Clean up previous snapshot listener
      unsubscribeFromSnapshot();

      if (currentFirebaseUser) {
        console.log(`AuthProvider: User is authenticated with UID: ${currentFirebaseUser.uid}. Fetching profile...`);
        setFirebaseUser(currentFirebaseUser);
        const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
        
        unsubscribeFromSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data() as UserProfile;
            console.log('AuthProvider: Firestore profile found:', { email: userData.email, rol: userData.rol });
            setUser(userData);
          } else {
            console.log('AuthProvider: User authenticated but no profile in Firestore.');
            setUser(null);
          }
          console.log('AuthProvider: Loading finished.');
          setLoading(false);
        }, (error) => {
          console.error("AuthProvider: Error fetching user profile:", error);
          setUser(null);
          console.log('AuthProvider: Loading finished due to error.');
          setLoading(false);
        });
      } else {
        console.log('AuthProvider: User is signed out.');
        setUser(null);
        setFirebaseUser(null);
        console.log('AuthProvider: Loading finished.');
        setLoading(false);
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up listeners.');
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
