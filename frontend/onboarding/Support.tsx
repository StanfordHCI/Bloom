import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import { SFSymbol } from 'react-native-sfsymbols';
import { useTheme } from '../context/ThemeContext';
import OnboardingButton from '../components/onboarding/OnboardingButton';

const Support: React.FC = () => {
  const { nextStepFrom } = useOnboarding();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[theme.onboarding.container, styles.safeArea]}>
      <View style={styles.mainContainer}>
        <View style={[styles.header, styles.contentPadding]}>
          <Text style={theme.typography.h3}>
            Great! Let me share how I can help support you on your fitness journey:
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollContent} 
          contentContainerStyle={styles.scrollContentContainer}
        >
          <View style={[theme.onboarding.middleSection, styles.contentPadding]}>
            <View style={styles.featureItem}>
              <SFSymbol
                name={"applewatch"}
                weight="regular"
                color={"black"}
                size={48}
                style={styles.icon}
              />
              <View style={styles.featureTextContainer}>
                <Text style={[
                  theme.typography.h3,
                  { fontWeight: 600, marginBottom: 2 }
                ]}>
                  Sync with Apple Healthkit
                </Text>
                <Text style={[
                  theme.typography.p,
                  { color: theme.colors.inactiveDark, fontSize: 14 }
                ]}>
                  I'll automatically track your activity with real-time data from your Apple Watch and Health app.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <SFSymbol
                name={"ellipsis.message"}
                weight="regular"
                color={"black"}
                size={48}
                style={styles.icon}
              />
              <View style={styles.featureTextContainer}>
                <Text style={[
                  theme.typography.h3,
                  { fontWeight: 600, marginBottom: 2 }
                ]}>
                  Set & Achieve Fitness Goals
                </Text>
                <Text style={[
                  theme.typography.p,
                  { color: theme.colors.inactiveDark, fontSize: 14 }
                ]}>
                  Chat with me to create custom fitness plans and stay motivated.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <SFSymbol
                name={"apple.meditate"}
                weight="regular"
                color={"black"}
                size={48}
                style={styles.icon}
              />
              <View style={styles.featureTextContainer}>
                <Text style={[
                  theme.typography.h3,
                  { fontWeight: 600, marginBottom: 2 }
                ]}>
                  Data Insights Just for You
                </Text>
                <Text style={[
                  theme.typography.p,
                  { color: theme.colors.inactiveDark, fontSize: 14 }
                ]}>
                  I'll analyze your activity trends and provide insights to help you improve.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, styles.buttonContainer]}>
          <OnboardingButton
          // @ts-expect-error Support not wired up to nextStepFrom
            onPress={() => { void nextStepFrom("Support"); }}
            label="Let's do it!"
            variant="primary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: 40,
  },
  buttonContainer: {
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 15,
    paddingTop: 30,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  footer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  icon: {
    width: 30,
    height: 30,
    marginRight: 25,
    marginTop: "10%",
  },
  featureTextContainer: {
    flex: 1,
  }
});

export default Support;
