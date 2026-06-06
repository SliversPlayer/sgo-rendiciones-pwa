import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

function readEnvValue(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.replace(/^"|"$/g, '');
}

const firebaseConfig = {
  apiKey: readEnvValue(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: readEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: readEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: readEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: readEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: readEnvValue(import.meta.env.VITE_FIREBASE_APP_ID),
};

export const missingFirebaseConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const hasFirebaseConfig = missingFirebaseConfigKeys.length === 0;
export { firebaseConfig };

const fallbackFirebaseConfig = {
  apiKey: 'missing-firebase-api-key',
  authDomain: 'missing-firebase-auth-domain.firebaseapp.com',
  projectId: 'missing-firebase-project',
  storageBucket: 'missing-firebase-project.appspot.com',
  messagingSenderId: '0',
  appId: 'missing-firebase-app-id',
};

const runtimeFirebaseConfig = hasFirebaseConfig ? firebaseConfig : fallbackFirebaseConfig;

export const firebaseApp = initializeApp(runtimeFirebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
