import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { firestore } from "../firebase";
import { STUDY_ID } from "../config";
import captureError from "./errorHandling";

export const useTimezoneUpdater = () => {
  const { uid } = useAuth();

  useEffect(() => {
    if (!uid) return;

    const updateTimezone = async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
        await setDoc(userDocRef, { timezone: tz }, { merge: true });
      } catch (err) {
        captureError(err, "Error updating user timezone in Firestore");
      }
    };

    void updateTimezone();
  }, [uid]);
};
