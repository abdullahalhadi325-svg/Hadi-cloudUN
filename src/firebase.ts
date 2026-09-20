import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "demo-hadi-cloud-key",
  authDomain: "hadi-cloud.firebaseapp.com",
  projectId: "hadi-cloud",
  storageBucket: "hadi-cloud.appspot.com",
  messagingSenderId: "101723257754",
  appId: "1:101723257754:web:hadicloud01"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);

// CRITICAL: Enable enableMultiTabIndexedDbPersistence(db) to prevent mobile browser cache crashes.
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed-precondition: multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence unimplemented in this browser environment');
    } else {
      console.warn('Firestore persistence initialization notice:', err);
    }
  });
}
