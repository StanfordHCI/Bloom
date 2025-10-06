import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import { useTheme } from "../context/ThemeContext";
import OnboardingButton from '../components/onboarding/OnboardingButton';
import { OnboardingStep } from '../context/OnboardingContext';
import img1 from '../assets/images/1.png';
import img2 from '../assets/images/2.png';
import img3 from '../assets/images/3.png';
import img4 from '../assets/images/4.png';
import img5 from '../assets/images/5.png';

const AmbientDisplayIntro: React.FC = () => {
    const { nextStepFrom } = useOnboarding();
    const { theme } = useTheme();
    const [currentImage, setCurrentImage] = useState(1);

    // Image rotation logic
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev % 5) + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const getImageSource = (number: number) => {
        switch (number) {
            case 1:
                return img1;
            case 2:
                return img2;
            case 3:
                return img3;
            case 4:
                return img4;
            case 5:
                return img5;
            default:
                return img1;
        }
    };

    return (
        <View style={[theme.onboarding.container, styles.container]}>
            {/* Fixed Header */}
            <View style={styles.header}>
                <Text style={[styles.title]}>
                    Say Hello to Your Garden
                </Text>
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
                <View style={styles.imageContainer}>
                    <Image
                        source={getImageSource(currentImage)}
                        style={styles.gardenImage}
                        resizeMode="contain"
                    />
                </View>

                <Text style={[styles.description, theme.typography.p]}>
                    This is your garden! As you complete your plan, flowers will grow and bees and butterflies will appear.
                </Text>
            </ScrollView>

            <View style={styles.footer}>
                <OnboardingButton
                    label="Next"
                    onPress={() => { void nextStepFrom("AmbientDisplayIntro" as OnboardingStep); }}
                    variant="primary"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        padding: 20,
        flexGrow: 1,
        alignItems: 'center',
    },
    header: {
        padding: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        marginVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gardenImage: {
        width: '90%',
        height: '90%',
    },
    description: {
        fontSize: 16,
        textAlign: 'left',
        marginHorizontal: 20,
    },
    footer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
});

export default AmbientDisplayIntro;
