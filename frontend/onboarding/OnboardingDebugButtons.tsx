import { NavigationContainerRef } from "@react-navigation/native";
import { TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import { OnboardingStep } from "../context/OnboardingContext";

type OnboardingDebugButtonsProps = {
    resetOnboarding: (navigationRef: NavigationContainerRef<OnboardingStep>) => void;
    skipOnboarding: (completeOnboarding: () => void) => void;
    completeOnboarding: () => void;
    navigationRef: NavigationContainerRef<OnboardingStep>;
};

const OnboardingDebugButtons: React.FC<OnboardingDebugButtonsProps> = ({
    resetOnboarding,
    skipOnboarding,
    completeOnboarding,
    navigationRef,
}) => {
    return (
        <SafeAreaView style={styles.floatingButtonsContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => void resetOnboarding(navigationRef)}
          >
            <SFSymbol name={"arrow.counterclockwise"} size={20} color={"black"}/>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              console.debug("Skip button pressed", skipOnboarding);
              void skipOnboarding(completeOnboarding);
            }}
          >
            <SFSymbol name={"forward.fill"} size={20} color={"black"}/>
          </TouchableOpacity>
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
  floatingButtonsContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
    paddingHorizontal: 10,
    display: 'none'
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

export default OnboardingDebugButtons;
