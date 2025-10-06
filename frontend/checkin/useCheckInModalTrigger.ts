import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "../firebase";
import { DateTime } from "luxon";
import { STUDY_ID } from "../config";
import { useAuth } from "../context/AuthContext";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../navigation/types";

export function useCheckInModalTrigger() {
  const { uid } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!uid) return;
    const ref = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.data();
      if (!data?.checkinTime) return;

      const checkinTime = typeof data.checkinTime === 'string' ? DateTime.fromISO(data.checkinTime) : DateTime.invalid("Invalid checkinTime");
      const nowPlus30 = DateTime.now().plus({ minutes: 30 });
      
      if (nowPlus30 > checkinTime) {
        navigation.navigate("CheckInFlow");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [uid, navigation]);
}
