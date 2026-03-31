'use client';

import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence, getRedirectResult, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import { reconcileAccount } from '@/lib/actions';

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
    const setAuthPersistence = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        await getRedirectResult(auth);
      } catch (error) {
        console.error("Auth setup error:", error);
      }
    };
    
    setAuthPersistence();

    let unsubscribeFromSnapshot: () => void = () => {};

    const unsubscribeFromAuth = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      unsubscribeFromSnapshot();
      setLoading(true);

      if (currentFirebaseUser) {
        // Run reconciliation silently in the background. No need to await.
        reconcileAccount(currentFirebaseUser.uid).then(result => {
          if (result && 'success' in result && !result.message.includes('ya estaba sincronizada')) {
            console.log(`Reconciliation for ${currentFirebaseUser.uid}: ${result.message}`);
          } else if (result && 'error' in result) {
            console.error(`Reconciliation failed for ${currentFirebaseUser.uid}: ${result.error}`);
          }
        });

        setFirebaseUser(currentFirebaseUser);
        
        const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
        
        unsubscribeFromSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setUser(userData);
            setLoading(false);
          } else {
             console.error(`CRITICAL: User ${currentFirebaseUser.uid} authenticated but has no profile document. Forcing logout.`);
             // This handles data inconsistency. Instead of letting the app crash,
             // we force a logout. onAuthStateChanged will be triggered again and handle the state cleanup.
             signOut(auth);
          }
        }, (error) => {
          console.error('Firestore snapshot error on user profile:', error);
          setUser(null);
          setLoading(false);
        });

      } else {
        // No user logged in
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
