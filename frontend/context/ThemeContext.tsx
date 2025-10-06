import React, { createContext, useContext, useState } from "react";
import { TextStyle, ViewStyle } from "react-native";

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    background: string;
    transparent: string;
    inactiveLight: string;
    inactiveDark: string;
    text: string;
    textDisabled: string;
    chatBar: string;
    chatInputText: string;
    chatMessageUserBackground: string;
    chatMessageUserText: string;
    chatMessageSystemBackground: string;
    chatMessageSystemText: string;
    success: string;
    darkGrey: string;
  };
  typography: {
    center: TextStyle;
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    p: TextStyle;
    cardHeading: TextStyle;
    cardSubheading: TextStyle;
  };
  onboarding: {
    container: ViewStyle;
    topSection: ViewStyle;
    middleSection: ViewStyle;
    bottomSection: ViewStyle;
    button: {
      container: ViewStyle;
      text: TextStyle;
    };
  };
}

const baseTheme: Omit<Theme, "colors" | "backgroundImage"> = {
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: "bold",
      fontFamily: "HankenGrotesk-Bold",
      marginBottom: 10,
    },
    h2: {
      fontSize: 24,
      fontWeight: "600",
      fontFamily: "HankenGrotesk-SemiBold",
      marginBottom: 10,
    },
    h3: {
      fontSize: 18,
      fontWeight: "500",
      fontFamily: "HankenGrotesk-Medium",
      marginBottom: 10,
    },
    p: {
      fontSize: 16,
      fontWeight: "400",
      fontFamily: "HankenGrotesk-Regular",
    },
    cardHeading: {
      fontSize: 20,
      fontWeight: "bold",
      fontFamily: "HankenGrotesk-Bold",
    },
    cardSubheading: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: "HankenGrotesk-SemiBold",
    },
    center: {
      textAlign: "center",
    },
  },
  onboarding: {
    container: {
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: 20,
      paddingTop: 60,
      backgroundColor: "white",
    },
    topSection: {
      flex: 1,
      width: "100%",
      justifyContent: "flex-start",
      alignItems: "center",
    },
    middleSection: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    bottomSection: {
      flex: 1,
      width: "100%",
      justifyContent: "flex-end",
      alignItems: "center",
      marginBottom: 20,
    },
    button: {
      container: {
        padding: 15,
        borderRadius: 20,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        height: 60,
      },
      text: {
        fontWeight: "500",
        fontFamily: "HankenGrotesk-Regular",
        fontSize: 18,
        color: "white",
      },
    },
  },
};

export const gardenTheme: Theme = {
  ...baseTheme,
  colors: {
    primary: "#266B30",
    secondary: "#40AE3E",
    tertiary: "#C2E9BF",
    background: "#CCEEAA",
    transparent: "#FFFFFF90",
    inactiveLight: "#EDEDED",
    inactiveDark: "#818181",
    text: "#266B30",
    textDisabled: "#818181",
    chatBar: "#ffffff",
    chatInputText: "#000000",
    chatMessageUserBackground: "#266B30",
    chatMessageUserText: "#FFFFFF",
    chatMessageSystemBackground: "#ffffff",
    chatMessageSystemText: "#000000",
    success: "#4CAF50",
    darkGrey: "#424242",
  },
};

export const spaceTheme: Theme = {
  ...baseTheme,
  colors: {
    primary: "#bb86fc",
    secondary: "#03dac6",
    tertiary: "#03dac6",
    background: "#121212",
    transparent: "#FFFFFF90",
    inactiveLight: "#EDEDED",
    inactiveDark: "#818181",
    text: "#ffffff",
    textDisabled: "#818181",
    chatBar: "#ffffff",
    chatInputText: "#000000",
    chatMessageUserBackground: "#3F5F1A",
    chatMessageUserText: "#FFFFFF",
    chatMessageSystemBackground: "#ffffff",
    chatMessageSystemText: "#000000",
    success: "#4CAF50",
    darkGrey: "#424242",
  },
};

export const oceanTheme: Theme = {
  ...baseTheme,
  colors: {
    primary: "#ff9800",
    secondary: "#4caf50",
    tertiary: "#4caf50",
    background: "#f5f5dc",
    transparent: "#FFFFFF90",
    inactiveLight: "#EDEDED",
    inactiveDark: "#818181",
    text: "#333333",
    textDisabled: "#999999",
    chatBar: "#ffffff",
    chatInputText: "#000000",
    chatMessageUserBackground: "#3F5F1A",
    chatMessageUserText: "#ffffff",
    chatMessageSystemBackground: "#ffffff",
    chatMessageSystemText: "#000000",
    success: "#4CAF50",
    darkGrey: "#424242",
  },
};

export interface ThemeContextType {
  theme: Theme;
  switchTheme: (themeName: string) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = gardenTheme,
}) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const switchTheme = (themeName: string) => {
    switch (themeName) {
      case "gardenTheme":
        setTheme(gardenTheme);
        break;
      case "spaceTheme":
        setTheme(spaceTheme);
        break;
      case "oceanTheme":
        setTheme(oceanTheme);
        break;
      default:
        console.warn(`Unknown theme: ${themeName}`);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
