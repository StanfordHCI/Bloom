import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View, TouchableOpacity } from "react-native";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { BACKEND_URL } from "../../config";
import Card from "../Card";
import AppText from "../AppText";
import beeIcon from "../../assets/images/Bee.png";
import { SFSymbol } from "react-native-sfsymbols";

interface JourneySummaryProps {
  weekIndex: number;
}

const JourneySummary: React.FC<JourneySummaryProps> = ({ weekIndex }) => {
  const { theme } = useTheme();
  const { authToken } = useAuth();

  const [collapsed, setCollapsed] = useState(true);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
  
    if (!newCollapsed && summary.length === 0 && authToken) {
      setIsLoading(true);
      try {
        const resp = await axios.post<{ summary: string }>(
          `${BACKEND_URL}/summary/journey`,
          { weekIndex },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            timeout: 30000,
          }
        );
        if (resp.data?.summary) {
          setSummary(resp.data.summary);
        }
      } catch (error) {
        console.error("Failed to fetch journey summary:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card>
      <TouchableOpacity style={styles.header} onPress={() => void handleToggle()}>
        <View style={styles.titleContainer}>
          <Image source={beeIcon} style={styles.beeIcon} />
          <AppText style={[styles.headline, { color: theme.colors.darkGrey }]}>
            Beebo’s Summary
          </AppText>
        </View>
        {collapsed ? 
          <SFSymbol 
            name="chevron.down" 
            size={18} 
            color={theme.colors.inactiveDark}
            style={{ marginRight: 9 }}
          />
          : 
          <SFSymbol 
            name="chevron.up" 
            size={18} 
            color={theme.colors.inactiveDark}
            style={{ marginRight: 9 }}
          />
        }
      </TouchableOpacity>

      {!collapsed && (
        <View style={{ marginTop: 8 }}>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <AppText style={[theme.typography.p, styles.summaryText]}>
              {summary}
            </AppText>
          )}
        </View>
      )}
    </Card>
  );
};

export default JourneySummary;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  beeIcon: {
    width: 28,
    height: 32,
    resizeMode: "contain",
    marginRight: 8,
  },
  headline: {
    fontSize: 16,
    fontWeight: "bold",
  },
  summaryText: {
    color: "#000",
    paddingVertical: 8,
  }
});