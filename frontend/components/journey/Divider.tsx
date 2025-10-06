import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

const Divider: React.FC = () => {
  const { theme } = useTheme();
  return <View 
    style={{
      ...styles.divider,
      backgroundColor: theme.colors.primary,
    }}
  />;
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 16,
    opacity: 0.1
  },
});

export default Divider;
