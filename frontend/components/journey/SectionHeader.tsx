import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "../AppText";
import { useTheme } from "../../context/ThemeContext";

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  const { theme } = useTheme();
  
  return (
    <View style={styles.container}>
      <AppText style={[styles.title, { color: theme.colors.darkGrey }]}>
        {title}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
    marginLeft: 12,
  },
});

export default SectionHeader; 