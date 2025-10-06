import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Card from "../Card";
import AppText from "../AppText";
import { useTheme } from "../../context/ThemeContext";
import { SFSymbol } from "react-native-sfsymbols";

export interface ChatSessionDoc {
  sessionId: string;
  headline: string;
  iso: string;
  messageCount: number;
}

interface ChatCardProps extends ChatSessionDoc {
  onPress: () => void;
}

export const ChatCard: React.FC<ChatCardProps> = ({ headline, iso, messageCount, onPress }) => {
  const { theme } = useTheme();
  const dateStr = new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card>
      <TouchableOpacity onPress={onPress} style={stylesChatCard.touchable}>
        <View style={stylesChatCard.content}>
          <View style={stylesChatCard.iconCircle}>
        <SFSymbol
          name="message.fill"
          weight="semibold"
          scale="medium"
          color={theme.colors.secondary}
          style={stylesChatCard.icon}
        />
          </View>
          <View style={{ flex: 1 }}>
        <AppText style={[stylesChatCard.headline, { color: theme.colors.darkGrey }]}>
          {headline}
        </AppText>
        <AppText style={[stylesChatCard.subtext]}>
          {dateStr} • {messageCount} messages
        </AppText>
          </View>
          <SFSymbol
            name="chevron.compact.right"
            weight="semibold"
            scale="medium"
            color={theme.colors.textDisabled}
            style={stylesChatCard.chevron}
          />
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const stylesChatCard = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    width: 30,
    height: 30,
    marginHorizontal: 5,
  },
  chevron: {
    width: 15,
    height: 15
  },
  headline: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subtext: {
    fontSize: 12,
    color: "#666",
  },
});
