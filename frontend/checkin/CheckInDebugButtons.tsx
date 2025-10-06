import React from 'react';
import { TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import { NavigationContainerRef } from "@react-navigation/native";
import { CheckInStep } from "../context/CheckInContext";
import { useCheckIn } from "../context/CheckInContext";

type CheckInDebugButtonsProps = {
  navigationRef: NavigationContainerRef<CheckInStep>;
};

const CheckInDebugButtons: React.FC<CheckInDebugButtonsProps> = ({
  navigationRef,
}) => {
  const { resetCheckIn } = useCheckIn();

  const handleReset = () => {
    // First reset the navigation stack
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'CheckInWelcome' }],
    });
    
    // Then reset the check-in context state
    void resetCheckIn();
  };

  return (
    <SafeAreaView style={styles.floatingButtonsContainer}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleReset}
      >
        <SFSymbol name={"arrow.counterclockwise"} size={20} color={"black"}/>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  floatingButtonsContainer: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    zIndex: 10,
    paddingHorizontal: 10,
    display: 'none',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default CheckInDebugButtons; 