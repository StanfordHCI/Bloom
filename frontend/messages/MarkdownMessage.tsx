import React from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { Theme, useTheme } from '../context/ThemeContext';

interface MarkdownMessageProps {
  content: string;
  role: string;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, role }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.messageContainer}>
      <Markdown
        style={markdownStyles(theme, role)}
      >
        {content}
      </Markdown>
    </View>
  );
};

const markdownStyles = (theme: Theme, role: string) => ({
  body: {} as TextStyle,
  text: {
    ...theme.typography.p,
    color: role === 'user' ? theme.colors.chatMessageUserText : theme.colors.chatMessageSystemText
  },
});

const styles = StyleSheet.create({
  messageContainer: {
    minWidth: 25,
    backgroundColor: 'transparent',
    marginVertical: 4,
    marginHorizontal: 16
  },
});

export default MarkdownMessage;