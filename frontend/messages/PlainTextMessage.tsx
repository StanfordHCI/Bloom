import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AppText from '../components/AppText';

interface MarkdownMessageProps {
  content: string;
  role: string;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, role }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.messageContainer}>
      <AppText
        style={{
          color: role === 'user' ? theme.colors.chatMessageUserText : theme.colors.chatMessageSystemText,
          marginBottom: 10,
          marginTop: 10,
        }}
      >
        {content}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    minWidth: 25,
    backgroundColor: 'transparent',
    marginVertical: 4,
    marginHorizontal: 16
  },
});

export default MarkdownMessage;
