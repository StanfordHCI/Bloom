import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { BlurredBackground } from "./BlurredBackground";

interface CardProps {
  children?: ReactNode;
  style?: object;
}


const Card: React.FC<CardProps> = ({ children, style }) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <BlurredBackground />
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
    marginVertical: 4,
    overflow: 'hidden', // Prevent content overflow
  },
  contentContainer: {
    flexDirection: 'column',
  }
});

export default Card;
