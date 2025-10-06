import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from "../context/ThemeContext";
import { OnboardingStep } from '../context/OnboardingContext';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const GoalSetting: React.FC = () => {
    const { theme } = useTheme();

    return (
        <OnboardingHeaderFooter
            title="Set Your First Weekly Goal"
            nextStep={"GoalSetting" as OnboardingStep}
            buttonLabel="Create my plan"
        >
            <AppText style={styles.paragraph}>
                Staying active is one of the best things you can do for your health! The CDC recommends 150 minutes of moderate exercise per week. For example, this could be 30 minutes of brisk walking on 5 days a week. (CDC)
            </AppText>

            <AppText style={styles.paragraph}>
                Remember, everyone's physical activity journey is different and it's okay to start below these recommendations. You can gradually increase the amount of physical activity over the course of the program.
            </AppText>

            <AppText style={[styles.question, { color: theme.colors.primary }]}>
                Based on these guidelines, think about what short term goal would you like to achieve.
            </AppText>
        </OnboardingHeaderFooter>
    );
};

const styles = StyleSheet.create({
    paragraph: {
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 24,
        fontFamily: 'HankenGrotesk-Regular',
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        fontFamily: 'HankenGrotesk-SemiBold',
    },
});

export default GoalSetting;
