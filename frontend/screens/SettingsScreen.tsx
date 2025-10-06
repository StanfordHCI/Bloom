import { View, StyleSheet, SafeAreaView, ImageBackground, Dimensions, Linking } from "react-native";
import AppText from "./../components/AppText";
import AppButton from "./../components/AppButton";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import GradientBG from "../assets/images/Gradient-BG.png";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SettingsScreen = () => {
  const { signOut, email } = useAuth();
  const { theme } = useTheme();

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "white" }}>
      <ImageBackground 
        source={GradientBG}
        style={styles.absoluteFill}
      >
        <SafeAreaView style={styles.container}>
          <View style={[styles.supportCard, { backgroundColor: theme.colors.transparent }]}>
            <AppText>
              Experiencing problems? Reach out to the research staff:
            </AppText>
              <AppText
              style={styles.emailText}
              onPress={() => {
                void Linking.openURL("mailto:stanford.physical.activity.study@gmail.com");
              }}
              >
              stanford.physical.activity.study@gmail.com
              </AppText>
          </View>
          <View style={styles.contentContainer}>
            <AppText style={[styles.headerText, { color: theme.colors.text }]}>Account</AppText>
            <View style={styles.buttonContainer}>
              {email && (
                <AppText style={{ flex: 1 }}>
                  {email}
                </AppText>
              )}
              <AppButton
                title="Sign out"
                onPress={() => { void signOut(); }}
                style={styles.button}
              />
            </View>
          </View>

          <View style={styles.contentContainer}>
            <AppText style={[styles.headerText, { color: theme.colors.text }]}>App Info</AppText>
            <View style={styles.buttonContainer}>
              <AppText>Version: 1 (45)</AppText>

            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    position: "absolute",
    width: screenWidth,
    height: screenHeight,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'flex-start',
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    borderRadius: 6,
    alignSelf: 'flex-end'
  },
  supportCard: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
  },
  emailText: {
    color: '#007AFF',
    marginTop: 4,
  },
});

export default SettingsScreen;
