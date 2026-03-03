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
    console.log('AuthProvider: Setting up Firebase auth persistence...');
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence error:", error);
    });

    const loadingTimeout = setTimeout(() => {
        if (loading) {
            console.warn("AuthProvider: Loading timeout reached after 3 seconds. Forcing render.");
            setLoading(false);
        }
    }, 3000);

    let unsubscribeFromSnapshot: () => void = () => {};

    const unsubscribeFromAuth = onAuthStateChanged(auth, (currentFirebaseUser) => {
      console.log('AuthProvider: onAuthStateChanged triggered.');
      clearTimeout(loadingTimeout); // Got a response, clear the timeout
      unsubscribeFromSnapshot();

      if (currentFirebaseUser) {
        console.log(`AuthProvider: User is authenticated with UID: ${currentFirebaseUser.uid}. Fetching profile...`);
        setFirebaseUser(currentFirebaseUser);
        const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
        
        unsubscribeFromSnapshot = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            console.log('AuthProvider: Firestore profile found:', { email: userData.email, rol: userData.rol });
            setUser(userData);
            setLoading(false);
          } else {
            console.log('AuthProvider: User authenticated but no profile in Firestore. Creating one...');
            
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
                console.log('AuthProvider: New profile created successfully.');
                setUser(newUserProfile);
            } catch (error) {
                console.error("AuthProvider: Error creating user profile:", error);
                setUser(null);
            } finally {
               setLoading(false);
            }
          }
          console.log('AuthProvider: Loading finished for authenticated user.');
        }, (error) => {
          console.error("AuthProvider: Error fetching user profile:", error);
          setUser(null);
          setFirebaseUser(null);
          setLoading(false);
        });
      } else {
        console.log('AuthProvider: User is signed out.');
        setUser(null);
        setFirebaseUser(null);
        setLoading(false);
      }
    });

    return () => {
      console.log('AuthProvider: Cleaning up listeners.');
      clearTimeout(loadingTimeout);
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
