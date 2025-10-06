import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import OnboardingButton from '../components/onboarding/OnboardingButton';
import { useTheme } from "../context/ThemeContext";
import { OnboardingStep } from '../context/OnboardingContext';
import sampleInsights from '../assets/images/sample-insights.png';
import sampleWidget from '../assets/images/sample-widget.png';
import sampleWidgetAuto from '../assets/images/sample-autocomplete.png';
import AppText from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';


const FitnessPlanIntro: React.FC = () => {
    const { theme } = useTheme();
    const { nextStepFrom } = useOnboarding();

    return (
      <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
        <View style={styles.container}>
            <View style={styles.header}>
                <AppText style={styles.title}>Your 4-Week Fitness Plan</AppText>
            </View>

            <ScrollView style={styles.scrollContent}>
                <View style={[styles.featureContainer, { borderBottomWidth: 2 }]}>
                    <AppText style={[styles.featureTitle, { color: theme.colors.primary }]}>
                        Plan & Track Workouts
                    </AppText>
                    <AppText style={styles.featureDescription}>
                        Make progress towards your 4-week plan by completed workouts. Workouts logged by your wearable will be automatically added to the app and linked to your workout plan.
                    </AppText>
                    <Image 
                      source={sampleWidgetAuto} 
                      style={[
                        styles.featureImageWorkoutCard,
                        {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                        }
                      ]} 
                      resizeMode="contain" 
                    />

                </View>

                <View style={[styles.featureContainer, { borderBottomWidth: 0 }]}>
                    <AppText style={[styles.featureTitle, { color: theme.colors.primary }]}>
                        Grow Your Garden
                    </AppText>
                    <AppText style={styles.featureDescription}>
                    As you complete more workouts, your garden grows! Flowers bloom, butterflies flutter, and birds appear as you make progress towards your goals.
                    </AppText>
                    <Image source={sampleWidget} style={styles.featureImage} resizeMode="contain" />
                </View>

                <View style={[styles.featureContainer, { borderBottomWidth: 2 }]}>
                    <AppText style={[styles.featureTitle, { color: theme.colors.primary }]}>
                        Review Your Data
                    </AppText>
                    <AppText style={styles.featureDescription}>
                        See all of your data from your iPhone and wearable in one place.
                    </AppText>
                    <Image source={sampleInsights} style={styles.featureImage} resizeMode="contain" />
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <OnboardingButton
                    label="Continue"
                    onPress={() => { void nextStepFrom("FitnessPlanIntro" as OnboardingStep); }}
                    variant="primary"
                />
            </View>
        </View>
      </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    scrollContent: {
        flex: 1,
        padding: 16,
    },
    footer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        fontFamily: 'HankenGrotesk-Bold',
    },
    featureContainer: {
        marginBottom: 24,
        padding: 16,
        borderRadius: 0,
        borderColor: '#E0E0E0',
    },
    featureTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 10,
        fontFamily: 'HankenGrotesk-SemiBold',
    },
    featureDescription: {
        fontSize: 16,
        marginTop: 10,
        fontFamily: 'HankenGrotesk-Regular',
        marginBottom: 10,
    },
    featureImage: {
        width: '100%',
        height: 200,
        marginVertical: 8,
    },
    featureImageWorkoutCard: {
        width: '100%',
        height: 150,
        marginVertical: 8,
    },
});

export default FitnessPlanIntro;
