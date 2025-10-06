import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  connectAuthEmulator, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

// Temporary fix to get React Native persistence working with TypeScript
import * as firebaseAuth from "firebase/auth";
const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence; // eslint-disable-line
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  USE_FIREBASE_EMULATOR,
  FIREBASE_EMULATOR_HOST,
  FIREBASE_AUTH_EMULATOR_PORT,
  FIREBASE_FIRESTORE_EMULATOR_PORT,
  FIREBASE_STORAGE_EMULATOR_PORT,
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_URL,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
  STUDY_ID
} from "./config";

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  databaseURL: FIREBASE_DATABASE_URL,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = initializeAuth(app, {
  persistence: reactNativePersistence(AsyncStorage), // eslint-disable-line
});
const firestore = getFirestore(app);
const storage = getStorage(app);

// Configure Firebase Emulator Suite (if in local or device environments)
if (USE_FIREBASE_EMULATOR) {
  // Connect Firestore and Auth to emulators
  connectFirestoreEmulator(
    firestore,
    FIREBASE_EMULATOR_HOST,
    FIREBASE_FIRESTORE_EMULATOR_PORT
  );
  connectAuthEmulator(
    auth,
    `http://${FIREBASE_EMULATOR_HOST}:${FIREBASE_AUTH_EMULATOR_PORT}`
  );
  connectStorageEmulator(
    storage,
    FIREBASE_EMULATOR_HOST,
    FIREBASE_STORAGE_EMULATOR_PORT
  )
}

export const signUpUser = async (email: string, password: string): Promise<string> => {
  // This function DOES NOT handle errors
  // Errors are handled in the AuthProvider
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Write user email and other details to Firestore
  const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${userCredential.user.uid}`);
  await setDoc(userDocRef, {
    "email": email
  });

  const token = await userCredential.user.getIdToken();
  return token;
};

export const signInUser = async (email: string, password: string): Promise<string> => {
  // This function DOES NOT handle errors
  // Errors are handled in the AuthProvider
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  const token = await userCredential.user.getIdToken();
  return token;
};

export { app, auth, firestore, storage };
