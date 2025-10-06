import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { usePlan } from "../context/plan/WeeklyPlanContext";
import { fetchHealthKitData } from "./healthKitUpdaterHelpers";

/**
 * Custom hook to fetch HealthKit data when the screen is focused
 * @returns {object} Object containing loading state
 */
export function useHealthKitUpdater() {
  const { uid } = useAuth();
  const { programStartDate } = usePlan();

  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused - updating health data");

      const updateHealthData = async () => {
        if (uid && programStartDate) {
          try {
            await fetchHealthKitData(uid, programStartDate);
            console.log("Health data update completed");
          } catch (error) {
            console.error("Error updating health data:", error);
          }
        } else {
          console.log(
            "Missing uid or programStartDate, skipping health data update"
          );
        }
      };

      void updateHealthData();

      return () => {
        console.log("Screen unfocused - health data updates paused");
      };
    }, [uid, programStartDate])
  );
}
