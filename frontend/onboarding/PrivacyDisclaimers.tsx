import React from 'react';
import { View, Text, StyleSheet, Linking} from 'react-native';
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../context/ThemeContext";
import ExpandableSection from '../components/onboarding/ExpandableSection';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const PrivacyDisclaimers: React.FC = () => {
    const { theme } = useTheme();
    const sections = [
        {
            title: 'Activity Data Collection',
            icon: 'heart.text.square',
            content: [
                'The app will collect data continuously and include three months of historical records for the following data sources:',
                'Step count',
                'Distance walked/running',
                'Basal energy burned',
                'Active energy burned',
                'Flights climbed',
                'Exercise time',
                'Movement time',
                'Standing time',
                'Sleep duration',
                'Workout data',
                'Heart rate',
                'Resting heart rate',
                'Walking heart rate',
                'Heart rate variability',
                'Sleep duration'
            ]
        },
        {
            title: 'AI Integration',
            icon: 'cpu',
            content: [
                'All chats with the AI agent will be visible to the research team',
                'Interactions use the OpenAI API',
                'The OpenAI API will receive summarized representations of your activity data (not raw data)',
                'As per OpenAI\'s policies, your data will be retained for 30 days and then deleted by OpenAI. It will not be used to train OpenAI\'s AI models.'
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
                'Permissions can be updated anytime in Privacy settings.',
                'Grant or deny access to data sources at any time.'
            ]
        }
    ];

    return (
        <OnboardingHeaderFooter title="Privacy Notice" nextStep="PrivacyDisclaimers">
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
                <ExpandableSection key={index} title={section.title} content={section.content} icon={section.icon} />
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
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        padding: 16,
        paddingTop: 50,
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
    },
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
    safeArea: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
    },
    buttonContainer: {
        paddingHorizontal: 20,
    },
});

export default PrivacyDisclaimers;
