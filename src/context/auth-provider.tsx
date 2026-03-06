'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser, setPersistence, browserLocalPersistence, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isAdmin: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  isAdmin: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
      setIsAdmin(false); // Reset on auth state change

      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser);

        // Parallelize Firestore checks
        const adminDocRef = doc(db, 'admins', currentFirebaseUser.uid);
        const userDocRef = doc(db, 'users', currentFirebaseUser.uid);

        try {
          const [adminDoc] = await Promise.all([
             getDoc(adminDocRef),
          ]);

          const isAdminUser = adminDoc.exists();
          setIsAdmin(isAdminUser);

          // Once we know the admin status, start listening to the user profile
          unsubscribeFromSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as UserProfile;
              setUser(userData);
            } else {
              console.warn(`User ${currentFirebaseUser.uid} authenticated but has no profile document.`);
              setUser(null);
            }
            setLoading(false); // Finished loading
          }, (error) => {
            console.error('Firestore snapshot error on user profile:', error);
            setUser(null);
            setLoading(false);
          });

        } catch (error) {
            console.error('Error fetching admin status or user profile:', error);
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
        }

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
    <AuthContext.Provider value={{ user, firebaseUser, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
