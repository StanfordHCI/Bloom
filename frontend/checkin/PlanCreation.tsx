import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useCheckIn } from "../context/CheckInContext";
import "react-native-get-random-values";
import PlanCreationScreen from "../components/plan/PlanCreationScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppText from "../components/AppText";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PlanCreation: React.FC = () => {
  const { nextStepFrom } = useCheckIn();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const clearNavigationFlags = async () => {
      const isNavigatingBackward = await AsyncStorage.getItem("navigatingBackward");
      console.log("[CheckIn PlanCreation] navigatingBackward flag:", isNavigatingBackward);
      if (isNavigatingBackward !== "true") {
        await AsyncStorage.removeItem("navigatingBackward");
        console.log("[CheckIn PlanCreation] Cleared navigatingBackward flag");
      }
    };

    void clearNavigationFlags();
  }, []);

  const handleNext = () => {
    void nextStepFrom("PlanCreation");
  };


  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top }]}>
        <AppText style={styles.title}>Create Your Plan</AppText>
        <AppText style={styles.explanation}>
          Time to create your next plan! As a reminder, the CDC recommends 150 minutes of moderate exercise per week.
        </AppText>
      </View>

      <PlanCreationScreen
        goNext={handleNext}
        isOnboarding={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 16,
    paddingTop: 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'HankenGrotesk-Bold',
    marginBottom: 8,
  },
  explanation: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'HankenGrotesk-Regular',
  },
});

export default PlanCreation;
