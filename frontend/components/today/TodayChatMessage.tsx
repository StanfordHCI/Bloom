import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image, TouchableOpacity } from "react-native";
import Card from "../Card";
import { SFSymbol } from "react-native-sfsymbols";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import AppText from "../AppText";
import beeIcon from "../../assets/images/Bee.png";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { STUDY_ID } from "../../config";
import { firestore } from "../../firebase";

interface TodayChatMessageProps {
  onPress: () => void;
}

const TodayChatMessage: React.FC<TodayChatMessageProps> = ({ onPress }) => {
  const { theme } = useTheme();
  const { uid } = useAuth();

  const [llmMessage, setLlmMessage] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const fetchMessage = async () => {
      if (!uid) return;
      const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const llmMessage = userDocSnap.data().llmMessage as { title: string; body: string };
        setLlmMessage(llmMessage || null);
      }
    };
    void fetchMessage();
  }, [uid]);

  const handleDismiss = async () => {
    const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
    await setDoc(userDocRef, { llmMessage: {} }, { merge: true });
    setLlmMessage(null);
  };

  if (!llmMessage || (!llmMessage.title && !llmMessage.body)) {
    return null;
  }

  const { title, body } = llmMessage;

  return (
    <View style={styles.separator}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setTimeout(() => { void handleDismiss(); }, 1000);
          onPress()
        }}
      >
        <Card>
          <View style={styles.container}>
            <Image source={beeIcon} style={styles.beeIcon} />
            <View style={styles.textContainer}>
              <AppText numberOfLines={6} ellipsizeMode="tail">
                {`${title} ${body}`}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => { void handleDismiss(); }}
              style={styles.dismissButton}
            >
              <SFSymbol
                name="x.circle"
                weight="regular"
                scale="medium"
                color={theme.colors.inactiveDark}
                style={styles.dismissIcon}
              />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );
};

export default TodayChatMessage;

const styles = StyleSheet.create({
  separator: {
    marginBottom: 18
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 4
  },
  beeIcon: {
    width: 32,
    height: 32,
    resizeMode: "contain",
    marginRight: 10,
    marginTop: 4,
  },
  textContainer: {
    flex: 1,
  },
  dismissButton: {
    marginLeft: 8,
  },
  dismissIcon: {
    width: 24,
    height: 24,
  },
});
