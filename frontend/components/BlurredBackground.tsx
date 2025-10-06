import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';

type BlurredBackgroundProps = {
  borderRadius?: number;
};

export const BlurredBackground: React.FC<BlurredBackgroundProps> = ({ borderRadius = 15 }) => {
  return (
    <>
      <View style={[styles.filled, styles.overlay, { borderRadius }]}></View>
      <BlurView
        blurType="regular"
        reducedTransparencyFallbackColor="white"
        style={[styles.filled, { borderRadius }]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  filled: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    backgroundColor: "black",
    opacity: 0.07,
  },
});