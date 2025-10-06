import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import AppText from "../AppText";

const TABS = ["Day", "Week", "Overall"];

const TimeFilterTabs = ({
  onTabChange,
}: {
  onTabChange: (tab: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState(TABS[0]); // default to "Day"

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    onTabChange(tab);
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TabButton
          key={tab}
          label={tab}
          isActive={activeTab === tab}
          onPress={() => handleTabPress(tab)}
        />
      ))}
    </View>
  );
};

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        isActive ? { backgroundColor: theme.colors.primary } : { backgroundColor: 'rgba(0, 0, 0, 0.07)' }
      ]}
      onPress={onPress}
    >
      <AppText style={[
        styles.tabText,
        { color: isActive ? 'white' : theme.colors.darkGrey }
      ]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

export default TimeFilterTabs;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginVertical: 10,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
});