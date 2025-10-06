import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import AppText from "../AppText";
import beePng from "../../assets/images/Bee.png";
import { useTheme } from "../../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { NavigationViews } from "../../navigation/AppNavigator";
import { StackNavigationProp } from "@react-navigation/stack";
import { usePlan } from "../../context/plan/WeeklyPlanContext";

type JourneyMapNavigationProp = StackNavigationProp<
  NavigationViews,
  "JourneyWeekDetails"
>;

const JourneyMap = () => {
  const navigation = useNavigation<JourneyMapNavigationProp>();
  const { currentWeekIndex, loading } = usePlan();
  const { theme } = useTheme();

  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  
  // Default container height - keep it the same for 4 weeks
  const defaultContainerHeight = screenHeight * 0.55;
  
  // Default to 4 weeks, but add an extra week if currentWeekIndex is 3 or higher
  const baseWeeks = 4;
  const totalWeeks = Math.max(baseWeeks, currentWeekIndex + 2);
  
  // Calculate the reference ratio based on 4 weeks in the default space
  const referenceRatio = 4 / defaultContainerHeight;
  
  // Only increase container height if we have more than 4 weeks
  const containerHeight = totalWeeks > 4 
    ? Math.ceil(totalWeeks / referenceRatio)
    : defaultContainerHeight;
  
  const activeCircleSize = 156; // Increased from 120 by 30%
  const normalCircleSize = 104; // Increased from 80 by 30%
  const beeSize = 60;
  const completedColor = theme.colors.secondary; // Changed from #4CAF50
  const plannedColor = "#A9A9A9"; // Gray color for planned items

  // Create the array of weeks
  const weeks = Array.from({ length: totalWeeks }, (_, index) => ({
    week: index + 1,
    title: `Week ${index + 1}`,
    status: "planned",
  }));

  // Update weeks based on currentWeekIndex
  if (currentWeekIndex >= 0) {
    weeks.forEach((week, index) => {
      if (index < currentWeekIndex) {
        week.status = "completed";
        week.title = "Completed Week";
      } else if (index === currentWeekIndex) {
        week.status = "active";
        week.title = "Current Week";
      } else {
        week.status = "planned";
        week.title = "Upcoming Week";
      }
    });
  } else {
    weeks.forEach((week) => {
      week.status = "planned";
      week.title = "Upcoming Week";
    });
  }

  const calculateCirclePosition = (index: number) => {
    const isEven = index % 2 === 0;
    const x = isEven ? screenWidth * 0.25 : screenWidth * 0.75; // Adjusted from 0.2/0.8 to 0.25/0.75
    
    // Fixed starting offset regardless of total weeks
    const startOffset = containerHeight * 0.06; // Reduced from 0.08 to create less space above week 1
    
    // Increase available height to use more of the bottom space
    // Adjust the distribution to leave more space at the bottom
    const availableHeight = containerHeight * 0.9; // Increased from 0.85
    
    // If there's only one week, center it vertically
    if (totalWeeks === 1) {
      return { x, y: containerHeight / 2 };
    }
    
    // For multiple weeks, distribute them with more space at the bottom
    const y = startOffset + (index / (totalWeeks - 1)) * availableHeight;
    return { x, y };
  };

  const renderPaths = () => {
    return weeks.map((week, index) => {
      if (index < weeks.length - 1) {
        const start = calculateCirclePosition(index);
        const end = calculateCirclePosition(index + 1);
        const controlPoint1X = start.x;
        const controlPoint1Y = (start.y + end.y) / 2;
        const controlPoint2X = end.x;
        const controlPoint2Y = (start.y + end.y) / 2;

        const pathData = `M ${start.x} ${start.y} C ${controlPoint1X} ${controlPoint1Y} ${controlPoint2X} ${controlPoint2Y} ${end.x} ${end.y}`;

        // Update path color logic:
        // Path should be green (completed) if:
        // 1. Current week is completed AND next week is completed
        // 2. Current week is completed AND next week is active
        const shouldBeCompleted = 
          (weeks[index].status === "completed" && weeks[index + 1].status === "completed") ||
          (weeks[index].status === "completed" && weeks[index + 1].status === "active");

        const strokeColor = shouldBeCompleted ? completedColor : plannedColor;
        const strokeDasharray = shouldBeCompleted ? "" : "5, 5"; // Solid line for completed paths

        return (
          <Path
            key={index}
            d={pathData}
            stroke={strokeColor}
            strokeWidth={4}
            strokeDasharray={strokeDasharray}
            fill="none"
          />
        );
      }
      return null;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AppText>Loading Journey Map...</AppText>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={[
        styles.scrollContentContainer, 
        { 
          minHeight: containerHeight,
          paddingBottom: 80 // Add more bottom padding
        }
      ]}
      showsVerticalScrollIndicator={true}
    >
      <View style={[styles.mapContainer, { height: containerHeight }]}>
        {/* SVG Path for the Line */}
        <Svg
          height={containerHeight}
          width={screenWidth}
          style={StyleSheet.absoluteFillObject}
        >
          {renderPaths()}
        </Svg>

        {/* Circles */}
        {weeks.map((week, index) => {
          const { x, y } = calculateCirclePosition(index);
          const isActive = week.status === "active";
          const isCompleted = week.status === "completed";
          const circleSize = isActive ? activeCircleSize : normalCircleSize;

          return (
            <View
              key={week.week}
              style={[
                styles.circleContainer,
                {
                  position: "absolute",
                  left: x - circleSize / 2,
                  top: y - circleSize / 2,
                  width: circleSize,
                  height: circleSize,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  if ((week.week === currentWeekIndex + 1) || (week.week === 1 && currentWeekIndex === -1)) {
                    navigation.navigate("TopTabs", { initialRouteName: "Plan" });
                  } else {
                    navigation.navigate("JourneyWeekDetails", { week: week.week <= 0 ? 1 : week.week });
                  }
                }}
              >
                {isActive && (
                  <Image
                    source={beePng as ImageSourcePropType}
                    style={{
                      position: "absolute",
                      width: beeSize,
                      height: beeSize,
                      top: -beeSize / 1.8,
                      left: (circleSize - beeSize) / 2,
                      zIndex: -1,
                    }}
                    resizeMode="contain"
                  />
                )}
                <View
                  style={[
                    styles.circle,
                    {
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                      backgroundColor: isCompleted ? theme.colors.secondary : "#FFFFFF",
                      borderColor: isCompleted
                        ? `${theme.colors.primary}A6`  // Primary color with 65% opacity for completed weeks
                        : isActive
                          ? `${theme.colors.secondary}A6`
                          : plannedColor,
                      borderWidth: isActive ? 8 : isCompleted ? 2 : 2,
                    },
                  ]}
                >
                  <AppText
                    style={[
                      styles.weekText,
                      isCompleted && { color: "#FFFFFF" },
                      { maxWidth: circleSize * 0.8 }, // Limit text width
                      { fontSize: Math.min(14, circleSize * 0.2) }, // Dynamic font size
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    Week {week.week}
                  </AppText>
                  {isActive && (
                    <AppText
                      style={[
                        styles.weekSubtitle,
                        { maxWidth: circleSize }, // Limit text width
                        { fontSize: Math.min(12, circleSize * 0.077) }, // Dynamic font size
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {week.title}
                    </AppText>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    width: "100%",
  },
  scrollContentContainer: {
    paddingBottom: 0, // This will be overridden in the component
  },
  mapContainer: {
    width: "100%",
    position: "relative",
    marginTop: 5,
    marginBottom: 60, // Increased bottom margin
  },
  circleContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  circle: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  weekText: {
    fontWeight: "bold",
    textAlign: "center",
  },
  weekSubtitle: {
    color: "#A9A9A9",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default JourneyMap;