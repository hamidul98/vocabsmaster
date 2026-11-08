import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase web config comes from .env.local (VITE_FIREBASE_*). These values are
 * public identifiers, not secrets; access is protected by Firestore security rules.
 * Without them the app works exactly as before (browser-only storage).
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAFoOaWxCl6JXycx03lI6WFifmndsjabHc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'vocabs-master.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'vocabs-master',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:342888219988:web:ff6959772b213b1f86b4c1',
};
// Built-in fallbacks keep sign-in required even if the env vars are missing on a deploy.

export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;

if (firebaseEnabled) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}
