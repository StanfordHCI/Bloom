import { View, StyleSheet, Image } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { usePlan } from "../../context/plan/WeeklyPlanContext";
import AppText from "../AppText";
import activeLeafIcon from "../../assets/images/leaf-icon.png";
import inactiveLeafIcon from "../../assets/images/leaf-icon-inactive.png";
import Card from "../Card";

const TOTAL_LEAVES = 5;
const LEAF_SIZE = 26;

const WeeklyProgress = () => {
  const { theme } = useTheme();
  const { currentProgress } = usePlan();
  
  const progress = currentProgress * TOTAL_LEAVES; 

  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <AppText style={[styles.title, { color: theme.colors.darkGrey }]}>
            Weekly Progress
          </AppText>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.leafRow}>
            {Array.from({ length: TOTAL_LEAVES }).map((_, index) => {
              const fill = Math.min(Math.max(progress - index, 0), 1);
              return (
                <View key={index} style={{ width: LEAF_SIZE, height: LEAF_SIZE }}>
                  <Image
                    source={inactiveLeafIcon}
                    style={{ width: LEAF_SIZE, height: LEAF_SIZE, position: "absolute" }}
                  />
                  <View
                    style={{
                      width: LEAF_SIZE * fill,
                      height: LEAF_SIZE,
                      overflow: "hidden",
                      position: "absolute",
                    }}
                  >
                    <Image
                      source={activeLeafIcon}
                      style={{ width: LEAF_SIZE, height: LEAF_SIZE }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 75,
    padding: 0,
    height: 'auto',
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  leafRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
    gap: 4,
    marginBottom: 0,
  },
});

export default WeeklyProgress;
