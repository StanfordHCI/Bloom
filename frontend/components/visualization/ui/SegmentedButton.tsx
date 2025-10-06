import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '../../AppText';
import { useTheme } from '../../../context/ThemeContext';

interface SegmentedButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const SegmentedButton: React.FC<SegmentedButtonProps> = ({
  label,
  active,
  onPress,
}) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <AppText style={[styles.tabText, active && {
        ...styles.tabTextActive,
        color: theme.colors.primary,
      }]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
};

export default SegmentedButton;

const styles = StyleSheet.create({
  tabButton: {
    marginHorizontal: 6,
    paddingVertical: 2, 
    borderBottomWidth: 0,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32', 
  },
  tabText: {
    color: '#666',
    fontSize: 14, 
  },
  tabTextActive: {
    fontWeight: '600',
  },
});
