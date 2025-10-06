import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../context/ThemeContext";
import ExpandableSection from '../components/onboarding/ExpandableSection';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';

const HealthDisclaimers: React.FC = () => {
  const { theme } = useTheme();
  const sections = [
    {
      title: 'Cardiovascular Health',
      icon: 'waveform.path.ecg',
      content: [
        'Heart disease, high blood pressure, or history of stroke',
        'Chest pain or irregular heartbeats during exercise'
      ]
    },
    {
      title: 'Musculoskeletal Conditions',
      icon: 'figure.stairs',
      content: [
        'Joint pain, arthritis, or recent injuries',
        'Chronic back pain or spinal issues'
      ]
    },
    {
      title: 'Respiratory Health',
      icon: 'lungs',
      content: [
        'Asthma, COPD, or other breathing difficulties'
      ]
    },
    {
      title: 'Mental Health & Body Image',
      icon: 'apple.meditate',
      content: [
        'Disordered eating behaviors (anorexia, bulimia, binge eating)',
        'Diagnosed anxiety, depression, or conditions affecting motivation and body image'
      ]
    },
    {
      title: 'Additional Medical Considerations',
      icon: 'cross',
      content: [
        'Diabetes (risk of hypoglycemia during exercise)',
        'Pregnancy or postpartum recovery',
        'Neurological conditions (e.g., epilepsy, Parkinson\'s)'
      ]
    }
  ];

  return (
    <OnboardingHeaderFooter title="Health & Safety Information" nextStep="HealthDisclaimers">
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
            This app provides guidance for physical activity. It is not a substitute for professional medical advice or treatment.
          </Text>
        </View>
      </View>

      <Text style={styles.warningText}>
        If you have any of the following conditions, using this app and exercising may pose a higher risk of harm. Please proceed with caution.
      </Text>

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
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  safeArea: {
    backgroundColor: 'white',
    flex: 1,
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
  mainContainer: {
    flex: 1,
  },
});

export default HealthDisclaimers;
