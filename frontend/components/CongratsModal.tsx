import React, { useState, useEffect } from "react";
import { Modal, View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from "react-native";
import AppText from "./AppText";
import Bee from "../assets/images/Bee.png";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { storage } from "../firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { useAmbientDisplay } from "../context/AmbientDisplayContext";

interface CongratsModalProps {
  visible: boolean;
  onClose: () => void;
}

const CongratsModal: React.FC<CongratsModalProps> = ({ visible, onClose }) => {
  const { authToken, isControl } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>("Your garden is growing beautifully!");

  const { activeAmbientDoc } = useAmbientDisplay();

  const [imageURL, setImageURL] = useState<string>("");
  
  const [cropParams, setCropParams] = useState<{
    croppedWidth: number;
    croppedHeight: number;
    uncroppedHeight: number;
    translateY: number;
  } | null>(null);

  const { width: screenWidth } = Dimensions.get('window');
  const modalWidth = screenWidth * 0.85;
  const modalPadding = 20;

  useEffect(() => {
    if (!activeAmbientDoc?.url) return;
    const pathRef = ref(storage, activeAmbientDoc.url);
    getDownloadURL(pathRef)
      .then((downloadURL) => {
        setImageURL(downloadURL);
      })
      .catch((err) => {
        console.error("Failed to get storage URL:", err);
      });
  }, [activeAmbientDoc?.url]);

  useEffect(() => {
    if (!imageURL) return;

    // Get natural dimensions of the image
    Image.getSize(
      imageURL,
      (origWidth, origHeight) => {
        let croppedWidth = modalWidth - 2 * modalPadding;
        const scaleFactor = croppedWidth / 1320;
        croppedWidth = Math.round(croppedWidth);

        const uncroppedHeight = Math.round(origHeight * scaleFactor);
        const croppedHeight = Math.round(1386 * scaleFactor);

        const translateY = (uncroppedHeight - croppedHeight) - 2 * modalPadding - 1; // -1 ensures no narrow brown strip at the bottom

        console.log("Image dimensions:", { origWidth, origHeight, croppedWidth, croppedHeight, uncroppedHeight, translateY });

        setCropParams({
          croppedWidth,
          croppedHeight,
          uncroppedHeight,
          translateY,
        });
      },
      (error) => {
        console.error("Error getting image size:", error);
      }
    );
  }, [imageURL, screenWidth]);

  useEffect(() => {
    if (!visible || !activeAmbientDoc) return;
    setIsLoading(true);

    console.log(activeAmbientDoc.diff)

    if (isControl) {
      // Control => show activeAmbientDoc.diff
      setMessage(activeAmbientDoc.diff || "Your garden is growing beautifully!");
      setIsLoading(false);
    } else {
      const weekIndex = activeAmbientDoc.weekIndex
      if (typeof weekIndex !== "number") {
        console.error("Invalid weekIndex:", weekIndex);
        setMessage(activeAmbientDoc.diff || "Your garden is growing beautifully!");
        setIsLoading(false);
        return;
      }
      // Treatment => call LLM endpoint
      axios.post<{ summary: string }>(
        `${BACKEND_URL}/summary/ambient`,
        { 
          weekIndex: weekIndex,
          diffString: activeAmbientDoc.diff,
          critters: activeAmbientDoc.critters
        },
        {
          headers: {
        Authorization: `Bearer ${authToken}`,
          },
          timeout: 30000,
        }
      )
      .then((resp) => {
        if (resp.data?.summary) {
          setMessage(resp.data.summary);
        }
      })
      .catch((err) => {
        console.error("LLM request failed. Fallback to control message", err);
        setMessage(activeAmbientDoc.diff || "Your garden is growing beautifully!");
      })
      .finally(() => setIsLoading(false));
    }
  }, [visible, activeAmbientDoc, isControl, authToken]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { width: modalWidth, padding: modalPadding }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AppText style={styles.closeButtonText}>×</AppText>
          </TouchableOpacity>

          <ScrollView>
            <View style={styles.titleContainer}>
              <Image source={Bee} style={styles.beeIcon} />
              <AppText style={styles.title}>Your garden grew!</AppText>
            </View>

            {cropParams && imageURL ? (
              <View
                style={[
                  styles.cropContainer,
                  {
                    width: cropParams.croppedWidth,
                    height: cropParams.croppedHeight,
                  },
                ]}
              >
                <Image
                  source={{ uri: imageURL }}
                  style={{
                    width: cropParams.croppedWidth,
                    height: cropParams.uncroppedHeight,
                    transform: [{ translateY: -cropParams.translateY }],
                  }}
                />
              </View>
            ) : null}

            {isLoading ? (
              <ActivityIndicator size="small" color="#666" style={{ marginTop: 16 }} />
            ) : (
              <AppText style={styles.message}>
                {message}
              </AppText>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    maxHeight: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 10,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    gap: 8,
  },
  cropContainer: {
    overflow: "hidden",
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 16,
  },
  beeIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  message: {
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
    lineHeight: 22,
  },
});

export default CongratsModal;