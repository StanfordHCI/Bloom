import React, { createContext, useContext, useState, useEffect } from "react";
import { StyleSheet, Dimensions, ImageBackground, View, NativeModules, AppStateStatus, AppState } from "react-native";
import { img_1_0 } from "../utils/ambientDisplayImages";
import { firestore } from "../firebase.ts"; 
import { collection, query, where, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { STUDY_ID } from "../config";
import CongratsModal from "../components/CongratsModal";
import { rootNavigationRef } from "../App.tsx";

type WidgetBridgeType = {
  getAmbientDisplayImage(): Promise<string | null>;
};
const { WidgetBridge } = NativeModules as { WidgetBridge: WidgetBridgeType };

export interface AmbientDisplayDoc {
  id: string;
  diff: string;
  isActive: boolean;
  critters: {
    id: string;
    type: string;
    durationMin: number;
    day: string;
    timeStart: string;
  }[];
  hash: string;
  planDocId: string;
  progress: number;
  url: string;
  weekIndex: number;
  gardenGrew: boolean;
  modalShown: boolean;
}

type AmbientDisplayContextType = {
  updateAmbientDisplay: () => Promise<void>;
  activeAmbientDoc: AmbientDisplayDoc | null;
  setShowCongratsModal: (show: boolean) => void;
};

const AmbientDisplayContext = createContext<AmbientDisplayContextType | undefined>(undefined);

export const AmbientDisplayProvider = ({ children }: { children: React.ReactNode }) => {
  const [backgroundBase64, setBackgroundBase64] = useState<string | null>(null);
  const { uid, isOnboarding } = useAuth();
  const [activeAmbientDoc, setActiveAmbientDoc] = useState<AmbientDisplayDoc | null>(null);
  const [showCongratsModal, setShowCongratsModal] = useState(false);

  async function updateAmbientDisplay() {
    try {
      const base64Image: string | null = await WidgetBridge.getAmbientDisplayImage();
      if (!base64Image) {
        console.error("No base64 image returned from WidgetBridge");
        setBackgroundBase64(null);
      } else {
        console.log("Loaded base64 image from WidgetBridge");
        setBackgroundBase64(base64Image);
      }
    } catch (err) {
      console.log("Failed to fetch widget data or image from backend:", err);
      setBackgroundBase64(null);
    }
  }

  useEffect(() => {
    updateAmbientDisplay().catch((err) =>
      console.error("Error in useEffect while loading image:", err)
    );
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        updateAmbientDisplay().catch((err) =>
          console.error("Error updating ambient display on foreground:", err)
        );
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!uid) return;

    const colRef = collection(firestore, `studies/${STUDY_ID}/users/${uid}/ambient-display`);
    const q = query(colRef, where("isActive", "==", true), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setActiveAmbientDoc(null);
        return;
      }
      const docSnap = snapshot.docs[0];
      const data = docSnap.data() as AmbientDisplayDoc;
      setActiveAmbientDoc({
        ...data,
        id: docSnap.id,
      });
    });

    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    if (!activeAmbientDoc) return;
    const { gardenGrew, modalShown } = activeAmbientDoc;
    const currentRouteName = rootNavigationRef.current?.getCurrentRoute()?.name;
    const isInCheckInFlow = currentRouteName?.startsWith("CheckIn");

    if (gardenGrew && !modalShown && (isOnboarding || isInCheckInFlow)) {
      console.log("Preventing modal from showing during onboarding or check-in flow");
      setShowCongratsModal(false);
    }

    if (gardenGrew && !modalShown && !isOnboarding && !isInCheckInFlow) {
      setShowCongratsModal(true);
    }
  }, [activeAmbientDoc, isOnboarding, rootNavigationRef.current]);

  async function handleCloseModal() {
    setShowCongratsModal(false);
    if (activeAmbientDoc?.id) {
      const docRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}/ambient-display/${activeAmbientDoc.id}`);
      await updateDoc(docRef, { modalShown: true });
    }
  }

  return (
    <AmbientDisplayContext.Provider
      value={{
        updateAmbientDisplay,
        activeAmbientDoc,
        setShowCongratsModal,
      }}
    >
      <View style={{ flex: 1 }}>
        {backgroundBase64 ? (
          <ImageBackground
            source={{ uri: `data:image/jpeg;base64,${backgroundBase64}` }}
            style={styles.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <ImageBackground
            source={img_1_0}
            style={styles.absoluteFill}
            resizeMode="cover"
          />
        )}

        {showCongratsModal && (
          <CongratsModal
            visible={showCongratsModal}
            onClose={() => { void handleCloseModal(); }}
          />
        )}

        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </AmbientDisplayContext.Provider>
  );
};

export const useAmbientDisplay = () => {
  const context = useContext(AmbientDisplayContext);
  if (!context) {
    throw new Error("useAmbientDisplay must be used within AmbientDisplayProvider");
  }
  return context;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const styles = StyleSheet.create({
  absoluteFill: {
    position: "absolute",
    width: screenWidth,
    height: screenHeight,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});