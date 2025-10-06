import { StyleSheet, TextInput, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { SFSymbol } from "react-native-sfsymbols";


const lineHeight = 20;
const inputHeight = 2 * lineHeight;

const StaticInputBar: React.FC = () => {
  const { theme } = useTheme();
  return (
      <View style={[styles.container, { backgroundColor: theme.colors.chatBar }]}>
        <TextInput
          style={[
            styles.input,
            theme.typography.p,
            {
              height: inputHeight,
              minHeight: 2 * lineHeight, // Minimum height for the input
            },
          ]}
          placeholder="Ask Beebo!"
          value={""}
        />
  
        <View style={styles.iconWrapper}>
          <View
            style={styles.iconContainer}
          >
            <SFSymbol
                      name="waveform"
                      weight="semibold"
                      scale="large"
                      color="gray"
                      style={styles.iconSize}
                    />
          </View>
        </View>
      </View>
    );
  };
  
  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderColor: "lightgray",
      borderWidth: 1,
      borderRadius: 20,
    },
    input: {
      flex: 1, 
      fontSize: 16,
      paddingHorizontal: 8,
      paddingVertical: 10,
    },
    iconWrapper: {
      justifyContent: "flex-end", 
      marginLeft: 8, 
    },
    iconContainer: {
      justifyContent: "center",
      alignItems: "center",
      width: 40,
      height: 40,
    },
    iconSize: {
      width: 32,
      height: 32,
    },
  });

export default StaticInputBar;