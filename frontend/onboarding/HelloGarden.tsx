import React, { useState, useEffect } from 'react';
import { StyleSheet, Image } from 'react-native';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';
import sampleAmbient1 from '../assets/images/sample-ambient-1.png';
import sampleAmbient2 from '../assets/images/sample-ambient-2.png';
import sampleAmbient3 from '../assets/images/sample-ambient-3.png';
import sampleAmbient4 from '../assets/images/sample-ambient-4.png';
import sampleAmbient5 from '../assets/images/sample-ambient-5.png';

const HelloGarden: React.FC = () => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const ambientImages = [sampleAmbient1, sampleAmbient2, sampleAmbient3, sampleAmbient4, sampleAmbient5];

    useEffect(() => {
        const ambientInterval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % ambientImages.length);
        }, 1000);
        return () => clearInterval(ambientInterval);
    }, []);

    return (
        <OnboardingHeaderFooter title="Say Hello to Your Garden 🌱" nextStep="HelloGarden">
            <AppText style={styles.introText}>
                Your garden mirrors your fitness journey. With every 20% increment towards your <AppText style={{ fontWeight: 'bold', fontSize: 18 }}>weekly plan</AppText> progress, a flower in your garden grows, and blooms at 100%!
            </AppText>
            <AppText style={styles.introText}>
                For example, if you had 5 workouts planned, the plant would grow with every workout and bloom at the end of the fifth workout.
            </AppText>
            <Image source={ambientImages[currentImageIndex]} style={styles.image} />
        </OnboardingHeaderFooter>
    );
};

const styles = StyleSheet.create({
    image: {
        width: '100%',
        height: 400,
        resizeMode: 'contain',
    },
    introText: {
        fontSize: 18,
        marginBottom: 15,
        lineHeight: 26,
        fontFamily: 'HankenGrotesk-Regular',
    },
});

export default HelloGarden;
