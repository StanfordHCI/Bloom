import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ProgressBarProps {
  states: string[];
  currentState: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ states, currentState }) => {
  const { theme } = useTheme();
  const validCurrentState = states.includes(currentState) ? currentState : states[0];
  const completedStates = states.slice(0, states.indexOf(validCurrentState) + 1);

  return (
    <View style={styles.container}>
      {states.map((state: string, index: number) => (
        <View
          key={index}
          style={[
            styles.box,
            completedStates.includes(state) ? 
              { 
                backgroundColor: theme.colors.primary,
                borderWidth: 1,
                borderColor: theme.colors.primary,
              }
              : { 
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: theme.colors.primary,
               },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    marginTop: 40
  },
  box: {
    flex: 1,
    margin: 3,
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default ProgressBar;
