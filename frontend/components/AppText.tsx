import { Text, TextProps } from "react-native";
import { Theme, useTheme } from "../context/ThemeContext";

interface AppTextProps extends TextProps {
  variant?: keyof Theme["typography"];
  bold?: boolean;
  italic?: boolean;
}

const AppText: React.FC<AppTextProps> = ({
  variant = "p",
  bold,
  italic,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const variantStyle = theme.typography[variant];

  return (
    <Text
      style={[
        variantStyle,
        bold && { fontFamily: "HankenGrotesk-Bold" },
        italic && { fontStyle: "italic" },
        style,
      ]}
      {...props}
    />
  );
};

export default AppText;