import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBPcw5W2WS5Za4MkQIT8zLzcNw78dtwf60',
  authDomain: 'studio-250476632unshine-6c1a7.firebaseapp.com',
  projectId: 'studio-2504766329-6c1a7',
  storageBucket: 'studio-2504766329-6c1a7.appspot.com',
  messagingSenderId: '728874645997',
  appId: '1:728874645997:web:141cd82f5c7ef1b7d5cfe4'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
