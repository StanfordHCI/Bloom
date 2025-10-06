import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const PlanIntro: React.FC = () => {
    return (
        <OnboardingHeaderFooter
            title="Create Your Plan"
            nextStep="PlanCreation"
        >
            <AppText style={styles.introText}>
                Now we'll create your weekly plan! On the next screen, you'll set:
            </AppText>

            <View style={styles.checklistContainer}>
                <AppText style={styles.checklistItem}>
                    ✅  How many days per week you'll exercise
                </AppText>
                <AppText style={styles.checklistItem}>
                    ✅  Your preferred workout intensity
                </AppText>
                <AppText style={styles.checklistItem}>
                    ✅  Workout duration and schedule
                </AppText>
            </View>
        </OnboardingHeaderFooter>
    );
};

const styles = StyleSheet.create({
    introText: {
        fontSize: 18,
        marginBottom: 24,
        lineHeight: 26,
        fontFamily: 'HankenGrotesk-Regular',
    },
    checklistContainer: {
        marginTop: 8,
    },
    checklistItem: {
        fontSize: 18,
        marginBottom: 16,
        lineHeight: 26,
        fontFamily: 'HankenGrotesk-Regular',
    },
});

export default PlanIntro;
