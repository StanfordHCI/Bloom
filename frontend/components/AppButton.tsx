import React from "react";
import { Text, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../context/ThemeContext";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  iconName?: string;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  iconName,
  backgroundColor,
  textColor,
  style
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        style,
        { backgroundColor: backgroundColor || theme.colors.primary },
      ]}
    >
      {iconName && (
        <SFSymbol
          name={iconName}
          weight="semibold"
          scale="medium"
          style={[styles.icon, { backgroundColor: "transparent" }]}
        />
      )}
      <Text style={[styles.text, { color: textColor || "white" }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 20,
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default AppButton;
