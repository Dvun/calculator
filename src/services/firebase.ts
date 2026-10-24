/** Only public Firebase Web configuration is used here. NEVER import Admin SDK service accounts. */
import {initializeApp,type FirebaseApp} from 'firebase/app';
import {getAuth,type Auth} from 'firebase/auth';
import {getFirestore,type Firestore} from 'firebase/firestore';

const apiKey=import.meta.env.VITE_FIREBASE_API_KEY as string|undefined;
const authDomain=import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string|undefined;
const appId=import.meta.env.VITE_FIREBASE_APP_ID as string|undefined;
const projectId=import.meta.env.VITE_FIREBASE_PROJECT_ID as string|undefined;
export const firebaseConfigured=Boolean(apiKey&&appId&&projectId&&authDomain);
export const firebaseApp:FirebaseApp|null=firebaseConfigured?initializeApp({
 apiKey, appId, projectId,
 authDomain,
 storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string|undefined,
 messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string|undefined,
}):null;
export const firebaseAuth:Auth|null=firebaseApp?getAuth(firebaseApp):null;
export const firestore:Firestore|null=firebaseApp?getFirestore(firebaseApp):null;
