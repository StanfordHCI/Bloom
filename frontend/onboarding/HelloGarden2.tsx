import React, { useState, useEffect } from 'react';
import { StyleSheet, Image } from 'react-native';
import AppText from '../components/AppText';
import OnboardingHeaderFooter from '../components/onboarding/OnboardingHeaderFooter';
import sampleCritter1 from '../assets/images/sample-critters-1.png';
import sampleCritter2 from '../assets/images/sample-critters-2.png';
import sampleCritter3 from '../assets/images/sample-critters-3.png';
import sampleCritter4 from '../assets/images/sample-critters-4.png';
import sampleCritter5 from '../assets/images/sample-critters-5.png';

const HelloGarden2: React.FC = () => {
    const [currentCritterIndex, setCurrentCritterIndex] = useState(0);
    const critterImages = [sampleCritter1, sampleCritter2, sampleCritter3, sampleCritter4, sampleCritter5];

    useEffect(() => {
        const critterInterval = setInterval(() => {
            setCurrentCritterIndex((prevIndex) => (prevIndex + 1) % critterImages.length);
        }, 1000);
        return () => clearInterval(critterInterval);
    }, []);

    return (
        <OnboardingHeaderFooter title="Say Hello to Your Garden 🌱" nextStep="HelloGarden2">
            <AppText style={styles.introText}>
                In addition to the plants growing, you'll get a bee (walks) or butterfly (other workouts) for <AppText style={{ fontWeight: 'bold', fontSize: 18 }}>each workout</AppText> you complete. The size corresponds to the duration and the color corresponds to the activity type.
            </AppText>
            <Image source={critterImages[currentCritterIndex]} style={styles.image} />
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
        marginTop: 10,
        lineHeight: 26,
        fontFamily: 'HankenGrotesk-Regular',
    },
});

export default HelloGarden2;
