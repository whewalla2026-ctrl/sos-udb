'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
  UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};

var app: FirebaseApp;
var auth: Auth;

function ensureInitialized() {
  if (!app) {
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
      return null;
    }
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
  }
  return auth;
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  var fb = ensureInitialized();
  if (!fb) return null;
  var provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(fb, provider);
}

export function getFirebaseUser(): Promise<User | null> {
  return new Promise(function(resolve) {
    var fb = ensureInitialized();
    if (!fb) { resolve(null); return; }
    var unsubscribe = onAuthStateChanged(fb, function(user) {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getFirebaseIdToken(): Promise<string | null> {
  var fb = ensureInitialized();
  if (!fb) return null;
  var user = fb.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function firebaseSignOut(): Promise<void> {
  var fb = ensureInitialized();
  if (fb) await signOut(fb);
}

export { onAuthStateChanged };

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
}
