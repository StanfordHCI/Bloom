import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../context/ThemeContext";
import ExpandableSection from '../components/onboarding/ExpandableSection';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';
import { OnboardingStep } from '../context/OnboardingContext';

const PrivacyDisclaimers: React.FC = () => {
    const { theme } = useTheme();
    const sections = [
        {
            title: 'Activity Data Collection',
            icon: 'heart.text.square',
            content: [
                'If you grant permission, the app will collect data continuously for the duration of the study period and upload three months of historical records for the following data sources:',
                'Step count',
                'Distance walked/running',
                'Basal energy burned',
                'Active energy burned',
                'Flights climbed',
                'Exercise time',
                'Movement time',
                'Standing time',
                'Workout data',
                'Heart rate',
                'Resting heart rate',
                'Walking heart rate',
                'Heart rate variability',
                'Sleep duration'
            ]
        },
        {
            title: 'Data Processing',
            icon: 'server.rack',
            content: [
                'Your data will be used for research purposes only',
                'Data will be stored securely in our research database',
                'Only authorized research team members will have access to your data'
            ]
        },
        {
            title: 'Participation & Permissions',
            icon: 'lock.shield',
            content: [
                'You can manage permissions for specific data sources.',
                'Permissions can be updated anytime in your iPhone Privacy settings.',
                'Grant or deny access to data sources at any time.'
            ]
        }
    ];

    return (
        <OnboardingHeaderFooter
            title="Privacy Notice"
            nextStep={"PrivacyDisclaimersControl" as OnboardingStep}
        >
            <View style={styles.infoBox}>
                <SFSymbol
                    name="info.circle.fill"
                    weight="medium"
                    scale="medium"
                    color={theme.colors.primary}
                    style={styles.infoIcon}
                />
                <View style={styles.infoTextContainer}>
                    <Text style={styles.infoText}>
                      This research study involves collecting your activity data.
                    </Text>
                </View>
            </View>

            {sections.map((section, index) => (
                <ExpandableSection key={index} {...section} />
            ))}

            <Text style={styles.contactText}>
              If you have any questions, feel free to contact the study coordinator at{' '}
              <Text
                style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                onPress={() => void Linking.openURL('mailto:stanford.physical.activity.study@gmail.com')}
              >
                stanford.physical.activity.study@gmail.com
              </Text>
              .
            </Text>
        </OnboardingHeaderFooter>
    );
};

const styles = StyleSheet.create({
    infoBox: {
        backgroundColor: '#F0F7F0',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
        marginTop: 2,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoText: {
        fontSize: 16,
        flexShrink: 1,
    },
    warningText: {
        fontSize: 16,
        marginBottom: 20,
    },
    sectionContainer: {
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    icon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    sectionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    chevron: {
        width: 20,
        height: 20,
    },
    contentContainer: {
        padding: 16,
        paddingTop: 0,
    },
    contentItem: {
        fontSize: 14,
        marginBottom: 8,
    },
    contactText: {
        fontSize: 16,
        marginVertical: 20,
        marginBottom: 30,
    },
});

export default PrivacyDisclaimers;
