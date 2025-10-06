import React from 'react';
import { StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const WelcomeToBloom: React.FC = () => {
    return (
        <OnboardingHeaderFooter title="Welcome to Bloom 🌸" nextStep="WelcomeToBloom">
            <AppText style={styles.introText}>
                Welcome to your 4-week fitness program! While using <AppText style={{ fontWeight: 'bold', fontSize: 18 }}>Bloom</AppText>, you will create plans, track your progress, and get insights into your physical activity.
            </AppText>

            <AppText style={styles.introText}>
                In this program, each week runs from <AppText style={{ fontWeight: 'bold', fontSize: 18 }}>Sunday to Saturday</AppText>. Today, we'll start by creating your <AppText style={{ fontWeight: 'bold', fontSize: 18 }}>first weekly plan</AppText> for the upcoming week based on a few questions.
            </AppText>

            <AppText style={styles.introText}>
                Press <AppText style={{ fontWeight: 'bold', fontSize: 18 }}>Continue</AppText> to meet your coach and set your first goal!
            </AppText>
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
});

export default WelcomeToBloom;
