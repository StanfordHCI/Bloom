import React from "react";
import { View, StyleSheet } from "react-native";
import { SFSymbol } from "react-native-sfsymbols";
import { TouchableOpacity } from "react-native-gesture-handler";
import AppText from "../../AppText";

interface NavigationRowProps {
  dateRangeLabel: string;
  onPressLeft: () => void;
  onPressRight: () => void;
  disableRight: boolean;
  disableAll?: boolean;
}

const NavigationRow: React.FC<NavigationRowProps> = ({
  dateRangeLabel,
  onPressLeft,
  onPressRight,
  disableRight,
  disableAll = false,
}) => {
  return (
    <>
      {disableAll ? (
        <View style={[styles.navigationRow,
          { justifyContent: "center", alignItems: "center" }
        ]}>
          <AppText variant="p" style={styles.dateRangeLabel}>
            {dateRangeLabel}
          </AppText>
        </View>
      ) : (
        <View style={styles.navigationRow}>
          <ArrowButton direction="left" onPress={onPressLeft} disabled={false} />
          <AppText variant="p" style={styles.dateRangeLabel}>
            {dateRangeLabel}
          </AppText>
          <ArrowButton direction="right" onPress={onPressRight} disabled={disableRight}/>
        </View>
      )}
    </>
  );
};

export default NavigationRow;

const ArrowButton: React.FC<{
  direction: "left" | "right";
  onPress: () => void;
  disabled: boolean;
}> = ({ direction, onPress, disabled }) => {
  return disabled ? (
    <View style={[styles.arrowButton, { opacity: 0.5 }]}>
      <SFSymbol name={`chevron.${direction}`} size={12} color="#666" />
    </View>
  ) : (
    <TouchableOpacity style={styles.arrowButton} onPress={onPress}>
      <SFSymbol name={`chevron.${direction}`} size={12} color="#666" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  navigationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  arrowButton: {
    borderRadius: 8,
    height: 24,
    width: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  dateRangeLabel: {
    color: "gray",
  },
});
