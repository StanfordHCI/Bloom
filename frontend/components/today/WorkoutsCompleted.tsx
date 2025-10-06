import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SFSymbol } from 'react-native-sfsymbols';
import { useTheme } from "../../context/ThemeContext";
import AppText from "../AppText";
import Card from "../Card";
import plant from "../../assets/images/plant.png";
import purpleFlowerHead from "../../assets/images/purple-flower-head.png";
import pinkFlowerHead from "../../assets/images/pink-flower-head.png";
import blueFlowerHead from "../../assets/images/blue-flower-head.png";
import yellowFlowerHead from "../../assets/images/yellow-flower-head.png";
import redFlowerHead from "../../assets/images/red-flower-head.png";
import { useAmbientDisplay } from '../../context/AmbientDisplayContext';

interface WorkoutsCompletedProps {
  currentWeekIndex: number;
  currentProgress: number;
  onDismiss?: () => void;
}

const getCircleColor = (weekIndex: number, isDefaultMessage: boolean): string => {
  // If it's just "Your garden grew!", use white
  if (!isDefaultMessage) {
    switch (weekIndex + 1) {
      case 1:
        return '#E6E6FA'; // lilac
      case 2:
        return '#FFE4E8'; // light pink
      case 3:
        return '#E6F3FF'; // light blue
      case 4:
        return '#FFE6E6'; // very light red
      default:
        return '#E8F5E9'; // default green
    }
  }
  return 'theme.colors.tertiary'; // white for default message
};

const getFlowerHeads = (weekIndex: number) => {
  switch (weekIndex + 1) {
    case 1:
      return [purpleFlowerHead];
    case 2:
      return [pinkFlowerHead];
    case 3:
      return [blueFlowerHead, yellowFlowerHead];
    case 4:
      return [redFlowerHead];
    default:
      return [purpleFlowerHead];
  }
};

const WorkoutsCompleted: React.FC<WorkoutsCompletedProps> = ({
  currentWeekIndex,
  currentProgress,
  onDismiss
}) => {
  const { theme } = useTheme();
  const { activeAmbientDoc, setShowCongratsModal } = useAmbientDisplay();
  const gardenGrew = activeAmbientDoc?.gardenGrew ?? false;

  const isWeeklyCompletion = currentProgress === 1;
  const flowerHeads = isWeeklyCompletion ? getFlowerHeads(currentWeekIndex) : [];
  const iconToShow = isWeeklyCompletion ? flowerHeads[0] : plant;
  const circleColor = getCircleColor(currentWeekIndex, !isWeeklyCompletion);

  const content = !gardenGrew ? (
    <Card>
      <View style={styles.completedMessageContainer}>
        <AppText style={[styles.title, { color: theme.colors.darkGrey, fontWeight: '500' }]}>
          All workouts completed!
        </AppText>
      </View>
    </Card>
  ) : (
    <TouchableOpacity
      onPress={() => setShowCongratsModal(true)}
      activeOpacity={0.7}
    >
      <Card>
        <View style={styles.gardenGrewContainer}>
          <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
            <Image
              source={iconToShow}
              style={styles.plantIcon}
            />
          </View>
          <View style={styles.textColumn}>
            <AppText style={[styles.title, { color: theme.colors.darkGrey, fontWeight: '500' }]}>
              {isWeeklyCompletion ? "Weekly plan completed!" : "Your garden grew!"}
            </AppText>
            <AppText style={[styles.subtitle, { color: theme.colors.textDisabled }]}>
              Tap to view your progress.
            </AppText>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
  return (
    <View style={styles.wrapper}>
      {onDismiss && (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <SFSymbol
            name="xmark"
            weight="semibold"
            scale="small"
            color={theme.colors.inactiveDark}
            style={styles.xIcon}
          />
        </TouchableOpacity>
      )}

      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  completedMessageContainer: {
    padding: 12,
    alignItems: 'center',
  },
  gardenGrewContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  plantIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  textColumn: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  wrapper: {
    position: "relative",
  },
  dismissButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  xIcon: {
    width: 14,
    height: 14,
  },
});

export default WorkoutsCompleted;
