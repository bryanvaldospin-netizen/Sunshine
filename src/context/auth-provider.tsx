'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
      setIsAdmin(false); 

      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser);

        // Check for admin role
        if (currentFirebaseUser.uid === 'daNNsN4y5lgsTtrioMXNXcX24ZH2') {
            const adminDocRef = doc(db, 'admins', currentFirebaseUser.uid);
            try {
                const adminDocSnap = await getDoc(adminDocRef);
                if (adminDocSnap.exists() && adminDocSnap.data().role === 'admin') {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error("Error checking admin status:", e);
            }
        }
        
        // Subscribe to user profile
        const userDocRef = doc(db, 'users', currentFirebaseUser.uid);
        
        unsubscribeFromSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setUser(userData);
          } else {
             // For admin user, they might not have a profile in 'users' collection
            if (!isAdmin) {
               console.warn(`User ${currentFirebaseUser.uid} authenticated but has no profile document.`);
            }
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Firestore snapshot error on user profile:', error);
          setUser(null);
          setLoading(false);
        });

      } else {
        // No user logged in
        setUser(null);
        setFirebaseUser(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeFromAuth();
      unsubscribeFromSnapshot();
    };
    
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
