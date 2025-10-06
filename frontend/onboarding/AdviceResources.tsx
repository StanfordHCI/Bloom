import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import OnboardingButton from '../components/onboarding/OnboardingButton';
import { OnboardingStep } from '../context/OnboardingContext';
import AppText from '../components/AppText';
import ExpandableSection from '../components/onboarding/ExpandableSection';

const AdviceResources: React.FC = () => {
    const { nextStepFrom } = useOnboarding();

    const obstacles = [
        {
            barrier: "Feeling discomfort",
            solutions: [
                "Feeling soreness, mild pain, etc. is normal when muscles haven't been used as much and may last a few days",
                "Before AND after your physical activity walk lightly for at least 5 mins",
                "Light stretching may help too"
            ]
        },
        {
            barrier: "Feeling unmotivated",
            solutions: [
                "It is normal to feel more motivated on some days than others",
                "Think about your goals and the long-term benefits of physical activity",
                "Reward yourself for walking",
                "Take small steps towards your goals",
                "Remember how you've motivated yourself to take action in the past"
            ]
        },
        {
            barrier: "Having No Energy",
            solutions: [
                "A lot of people think that they just don't have the energy to walk",
                "Exercise actually gives people MORE energy throughout the day! Think of the times that you felt better after you took a walk"
            ]
        },
        {
            barrier: "Having No Time",
            solutions: [
                "Schedule your exercise time",
                "Get up a few minutes early and take a brisk walk before leaving",
                "Walk for 10-15 mins during lunch and walk again when you get home",
                "Before you watch TV, walk at least 10 mins before you turn it on",
                "Make your regular routine more active by:",
                "Walking instead of driving or taking the bus",
                "Get off the bus 1-2 stops before your final destination",
                "Park further away or take the stairs instead of the elevator"
            ]
        },
        {
            barrier: "Feeling Sick",
            solutions: [
                "Being sick can make it hard to get back on track",
                "Gradually increase your exercise each day. For example, instead of working out for 30 minutes at one point in time, you could exercise for 5 or 10 mins a few times a day"
            ]
        },
        {
            barrier: "Feeling Stressed",
            solutions: [
                "Physical activity is a great stress reliever and can make you feel more relaxed",
                "Take a brisk walk alone or with a relative, friend, or neighbor",
                "Think on how have you felt less stressed after you exercise in the past"
            ]
        },
        {
            barrier: "Feeling Ashamed",
            solutions: [
                "Some people are ashamed to start walking because they have never done it and fear what others might think of them",
                "By exercising you are setting a positive example for others. If you have negative thoughts, try substituting them with positive thoughts such as:",
                "'I can do this! I am exercising for my health, so it doesn't matter what others think'",
                "'The next time will be easier.' It's always more difficult in the beginning",
                "'It is more of a shame to be sitting down and not taking charge of your health'"
            ]
        },
        {
            barrier: "Feeling unsafe",
            solutions: [
                "Remember these safety tips:",
                "ALWAYS walk in the direction of incoming traffic. Use sidewalks when available",
                "Cross only at corners; and make eye contact with the driver",
                "Wear light-colored or reflective clothing like hot pink or brilliant orange",
                "Don't walk alone—if possible walk with someone else or in areas where there are other walkers",
                "Tell someone your walking route and when you will return",
                "Leave jewelry and valuables at home – all you need are an ID, emergency contact info, a wristwatch, and pedometer"
            ]
        },
        {
            barrier: "Feeling unsupported or alone",
            solutions: [
                "Sometimes people around you might be able to support you if you ask them",
                "Be proactive and seek social support by asking a relative, friend, or neighbor to:",
                "Encourage exercise and listen to your exercise updates",
                "Walk with you once a week",
                "Ask if you have already gone on your walk",
                "Join a walking club at the senior center",
                "Visit a park with family/friends",
                "If walking alone, you can remind yourself that this is your time to take care of yourself and make your body stronger. You can also use this time to reflect, solve a problem, etc."
            ]
        },
        {
            barrier: "Weather",
            solutions: [
                "Don't let the weather stop you from reaching your physical activity goals",
                "Walk indoors (e.g., mall)",
                "Wear layers (as your body warms up you can remove layers)",
                "Wear gloves and a hat to warm you up faster AND protect you from the sun",
                "Seek out areas with shade trees or tall buildings to block the sun",
                "Stay hydrated and drink cool liquids (summer/winter)",
                "Wear light-colored clothes (summer)"
            ]
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <AppText style={styles.title}>Ways to Overcome Obstacles</AppText>
            </View>

            <ScrollView style={styles.scrollContent}>
                <View style={styles.contentContainer}>
                    <AppText style={styles.introText}>
                        Here are common obstacles you might face and practical solutions to overcome them. Tap on each obstacle to see helpful tips.
                    </AppText>

                    {obstacles.map((item, index) => (
                        <ExpandableSection
                            key={index}
                            title={item.barrier}
                            content={item.solutions}
                        />
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <OnboardingButton
                    label="Continue"
                    onPress={() => { void nextStepFrom("AdviceResources" as OnboardingStep); }}
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
    header: {
        padding: 16,
        paddingTop: 90,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    scrollContent: {
        flex: 1,
        padding: 16,
    },
    contentContainer: {
        paddingVertical: 16,
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
    introText: {
        fontSize: 18,
        marginBottom: 24,
        lineHeight: 26,
        fontFamily: 'HankenGrotesk-Regular',
    },
});

export default AdviceResources;
