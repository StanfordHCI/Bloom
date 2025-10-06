import React from "react";
import { StyleSheet, View, Text, ScrollView, ImageBackground, SafeAreaView, Dimensions } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import JourneyMap from "../../components/journey/JourneyMap";
import AppText from "../../components/AppText";
import Card from "../../components/Card";
import GradientBG from "../../assets/images/Gradient-BG.png";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const JourneyScreen = () => {
  const { theme } = useTheme();

  try {
    return (
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "white" }}>
        <ImageBackground 
          source={GradientBG}
          style={styles.absoluteFill}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fullWidthContainer}>
                <Card>
                  <AppText style={[styles.journeyMapTitle, { color: theme.colors.primary }]}>Track Your Journey</AppText>
                  <AppText style={styles.journeyMapText}>
                    Click into any week on the map to see your plan for that week!
                  </AppText>
                </Card>
              </View>
              <View style={styles.journeyMapContainer}>
                <JourneyMap />
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  } catch (error) {
    const errorMessage = "Error rendering JourneyScreen.";
    console.error(errorMessage, error);

    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            An error occurred while loading the Journey screen. Please try again
            later.
          </Text>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center"
  },
  journeyMapText: {
    fontSize: 16,
    fontWeight: 'medium',
    marginBottom: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
  },
  fullWidthContainer: {
    width: "90%",
    alignSelf: "center",
    marginVertical: 10,
    paddingBottom: 20,
  },
  journeyMapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  errorContainer: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%'
    
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
  safeArea: {
    flex: 1,
  },
  journeyMapContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    width: '100%',
  },
});

export default JourneyScreen;
