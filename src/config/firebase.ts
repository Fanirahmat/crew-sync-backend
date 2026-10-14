import admin from 'firebase-admin';
import { env } from '@/config/env';

let isFirebaseInitialized = false;

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    isFirebaseInitialized = true;
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Firebase Admin SDK. Falling back to mock broadcaster:', error);
  }
} else {
  console.log('ℹ️ Firebase credentials not provided in .env. Running FCM in mock/logger mode.');
}

export const firebaseAdmin = admin;
export const isFcmReady = () => isFirebaseInitialized;
