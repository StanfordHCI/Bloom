import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, User, onIdTokenChanged } from "firebase/auth";
import { NativeModules } from "react-native";
import { auth, signInUser, signUpUser } from "../firebase";
import { authenticateToken } from "../utils/auth";
import { isOnboardingCompleted, deleteOnboardingProgress } from "./OnboardingContext";
import captureError from "../utils/errorHandling";
import * as Sentry from "@sentry/react-native";
import { FirebaseError } from "firebase/app";
import { firestore } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { STUDY_ID } from "../config";

type AuthContextType = {
  authToken: string | null;
  uid: string | null;
  email: string | null; // Added email field
  isOnboarding: boolean;
  setIsOnboarding: (value: boolean) => void;
  isInitializing: boolean;
  showMainApp: boolean;
  completeOnboarding: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  showAuthModal: boolean;
  isControl: boolean | null;
  setIsControlState: (value: boolean) => Promise<void>;
  setShowAuthModal: (value: boolean) => void;
  firebaseOnboardingComplete: boolean | null;
  getFirebaseOnboardingPromise: () => Promise<boolean>;
  resetOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const { AuthBridge } = NativeModules as {
  AuthBridge: { 
    signInWithCustomToken: (token: string, isSignUp: boolean) => void;
    isSignedIn: () => Promise<string>;
  };
};

export const userFixableErrorCodes = new Set([
  "auth/invalid-email",
  "auth/user-not-found",
  "auth/wrong-password",
  "auth/weak-password",
  "auth/invalid-password",
  "auth/email-already-in-use",
  "auth/missing-password",
]);

export const errorCodeToMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/user-not-found":
      return "User not found";
    case "auth/wrong-password":
      return "Incorrect password";
    case "auth/weak-password":
      return "Password is too weak. Password should be at least 6 characters long."; 
    case "auth/invalid-password":
      return "Invalid password. Password should be at least 6 characters long."; 
    case "auth/email-already-in-use":
      return "Email already in use. Please choose a different email.";
    case "auth/missing-password":
      return "Please enter a password";
    default:
      return "An unknown error occurred";
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null); // Added email state
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showMainApp, setShowMainApp] = useState(false);
  const [isControl, setIsControl] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [firebaseOnboardingComplete, setFirebaseOnboardingComplete] = useState<boolean | null>(null);
  const onboardingCompleteResolverRef = useRef<null | ((val: boolean) => void)>(null);
  const onboardingCompletePromiseRef = useRef<Promise<boolean> | null>(null);

  if (!onboardingCompletePromiseRef.current) {
    onboardingCompletePromiseRef.current = new Promise<boolean>((resolve) => {
      onboardingCompleteResolverRef.current = resolve;
    });
  }

  const getFirebaseOnboardingPromise = () => {
    return onboardingCompletePromiseRef.current!;
  };

  useEffect(() => {
    const loadCondition = async () => {
      try {
        const storedCondition = await AsyncStorage.getItem("isControl");
        if (storedCondition !== null) {
          setIsControl(JSON.parse(storedCondition) as boolean);
        }
      } catch (error) {
        captureError(error, "Error loading isControl from AsyncStorage");
      }
    };

    void loadCondition();
  }, []);

  // Check and save if the participant is in the control group
  const setIsControlState = async (value: boolean) => {
    try {
      console.log('Setting isControl to', value);
      await AsyncStorage.setItem("isControl", JSON.stringify(value));
      setIsControl(value);
    } catch (error) {
      captureError(error, "Error saving isControl to AsyncStorage");
    }
  };

  const handleAuthState = async (user: User | null) => {
    console.log("Handling auth state changed");
    const onboardingCompleted = await isOnboardingCompleted();
    setIsInitializing(true);
    try {
      if (!user) {
        console.log("User is not signed in. Signing out.");
        console.log("Onboarding completed:", onboardingCompleted);
        if (!onboardingCompleted) {
          setIsOnboarding(true);
        } else {
          setShowAuthModal(true);
        }
        await signOut();
        setIsInitializing(false);
        return;
      }

      const token = await user.getIdToken();
      console.log("Onboarding completed:", onboardingCompleted);

      const email = user.email;
      if (email) {
        setEmail(email);
      }

      let nativeUID = "";
      try {
        nativeUID = await AuthBridge.isSignedIn(); 
        setShowAuthModal(false);
      } catch (err) {
        console.log("Native auth check failed", err);
      }
      
      if (nativeUID === user.uid) {
        console.log("Native client is already signed in with same UID. Skip bridging.");
        setAuthToken(token);
        setUid(user.uid);
      } else {
        try {
          const { verifiedUID, customToken } = await authenticateToken(token);
          AuthBridge.signInWithCustomToken(customToken, !onboardingCompleted);
  
          setAuthToken(token);
          setUid(verifiedUID);
        } catch (error) {
          captureError(error, "Token bridging failed, signing out");
          await firebaseSignOut(auth);
          setAuthToken(null);
          setUid(null);
        }
      }
      // If user has completed onboarding (AsyncStorage), but not in Firebase, sync with Firebase
      if (onboardingCompleted) {
        const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${user.uid}`);
        try {
          await setDoc(userDocRef, { onboardingComplete: true }, { merge: true });
        } catch (err) {
          console.warn(err, "Error retroactively setting onboardingComplete in Firestore");
        }
      }

      console.log("Onboarding completed: ", onboardingCompleted);
      setIsOnboarding(!onboardingCompleted);
      setShowMainApp(onboardingCompleted);

    } finally {
      setIsInitializing(false);
    }
    console.log("Done handling auth state");
  };

  // This snapshot sets firebaseOnboardingComplete and also resolves the promise if not yet resolved
  useEffect(() => {
    if (!uid) {
      onboardingCompletePromiseRef.current = new Promise<boolean>((resolve) => {
        onboardingCompleteResolverRef.current = resolve;
      });
      return;
    }

    const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      const data = snapshot.data();
      // If the user document doesn't have an email field
      // we know the snapshot listener will be called again
      if (!data?.email) return;

      if (data?.onboardingComplete) {
        console.log("User doc has onboardingComplete => bypassing onboarding flow");
        setFirebaseOnboardingComplete(true);
        
        if (onboardingCompleteResolverRef.current) {
          onboardingCompleteResolverRef.current(true);
          onboardingCompleteResolverRef.current = null;
        }
      } else {
        console.log("User doc says not complete or missing => normal onboarding");

        if (onboardingCompleteResolverRef.current) {
          onboardingCompleteResolverRef.current(false);
          onboardingCompleteResolverRef.current = null;
        }

        setFirebaseOnboardingComplete(false);
      }
    }, (error) => {
      console.error("Error fetching user document:", error);
    });

    return () => {
      unsubscribe();
    };
  }, [uid]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed");
      handleAuthState(user).catch((error) => {
        captureError(error, "Auth state handling error");
      });
    });

    const unsubscribeToken = onIdTokenChanged(auth, (user) => {
      if (!user) {
        console.warn("User is null in onIdTokenChanged");
        return;
      }

      user.getIdToken().then((token) => {
        console.log("Updated Firebase token");
        setAuthToken(token);
        setUid(user.uid);
      }).catch((error) => {
        captureError(error, "Error getting token in onIdTokenChanged");
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, []);


  useEffect(() => {
    const updateUserProfile = async () => {
      if (uid) {
        const appType = isControl ? "control" : "treatment";
        const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
        await setDoc(userDocRef, { appType }, { merge: true });
      }
    };

    void updateUserProfile();
  }, [uid, isControl]);

  const completeOnboarding = () => {
    setIsOnboarding(false);
    setShowMainApp(true);

    if (uid) {
      const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
      setDoc(userDocRef, { onboardingComplete: true }, { merge: true }).catch((err) => {
        console.error(err, "Error setting onboardingComplete in completeOnboarding");
      });

    }
  };

  const resetOnboarding = async () => {
    await deleteOnboardingProgress();
    setIsOnboarding(true);
    setShowMainApp(false);
    await signOut();
  }

  const signUp = async (email: string, password: string): Promise<void> => {
    try {
      await signUpUser(email, password);
      setEmail(email);
      Sentry.addBreadcrumb({
        category: "auth",
        message: "User sign-up succeeded",
        level: "info",
      });
      // await setToken(token, true);
    } catch (error) {
      const code = (error as FirebaseError)?.code || "";
      if (userFixableErrorCodes.has(code)) {
        // If the error is user-fixable, manually throw it so
        // so the UI screen can catch and display a user-friendly message
        throw error;
      } else {
        // Non-user-fixable error: capture it with Sentry
        // Still needs to be thrown so the UI can catch it
        captureError(error, `Error during sign-up for email: ${email}`);
        throw error;
      }
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      await signInUser(email, password);
      setEmail(email);
      Sentry.addBreadcrumb({
        category: "auth",
        message: "User sign-in succeeded",
        level: "info",
      });
      // await setToken(token, false);
    } catch (error) {
      const code = (error as FirebaseError)?.code || "";
      if (userFixableErrorCodes.has(code)) {
        // If the error is user-fixable, manually throw it so
        // so the UI screen can catch and display a user-friendly message
        throw error;
      } else {
        // Non-user-fixable error: capture it with Sentry
        // Still needs to be thrown so the UI can catch it
        captureError(error, `Error during sign-in for email: ${email}`);
        throw error;
      }
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      if (await isOnboardingCompleted()) {
        setShowAuthModal(true);
      }
      console.log("User signed out successfully")
      setAuthToken(null);
      setUid(null);
      setEmail(null);
      setShowMainApp(false);

      Sentry.addBreadcrumb({
        category: "auth",
        message: "User signed out",
        level: "info",
      });
    } catch (error) {
      captureError(error, "Error during sign-out");
      throw error; // Rethrow the error so the UI can handle it
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authToken,
        uid,
        email,
        isOnboarding,
        setIsOnboarding,
        isInitializing,
        showMainApp,
        completeOnboarding,
        signIn,
        signUp,
        signOut,
        isControl,
        setIsControlState,
        showAuthModal,
        setShowAuthModal,
        firebaseOnboardingComplete,
        getFirebaseOnboardingPromise,
        resetOnboarding
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
