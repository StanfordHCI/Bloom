import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image, Dimensions, Modal, TouchableOpacity } from "react-native";
import Card from "../Card";
import AppText from "../AppText";
import { storage } from "../../firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { useTheme } from "../../context/ThemeContext";

export interface AmbientDisplayDoc {
  createdAt: string;
  diff: string;
  url: string;
  gardenGrew: boolean;
}

export const AmbientDisplayCard: React.FC<AmbientDisplayDoc> = ({
  gardenGrew,
  diff,
  url,
}) => {
  const { theme } = useTheme();
  if (!gardenGrew) return null;

  const [imageURL, setImageURL] = useState<string>("");
  const [cropParams, setCropParams] = useState<{
    croppedWidth: number;
    croppedHeight: number;
    uncroppedHeight: number;
    translateY: number;
  } | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalCropParams, setModalCropParams] = useState<{
    croppedWidth: number;
    croppedHeight: number;
    uncroppedHeight: number;
    translateY: number;
  } | null>(null);

  const { width: screenWidth } = Dimensions.get("window");
  const cardWidth = screenWidth * 0.25;
  const modalWidth = screenWidth * 0.85;
  const modalPadding = 20;

  useEffect(() => {
    if (!url) return;
    const pathRef = ref(storage, url);
    getDownloadURL(pathRef)
      .then((dlURL) => {
        console.log("Got storage URL:", dlURL);
        setImageURL(dlURL);
      })
      .catch((err) => {
        console.error("Failed to get storage URL:", err);
      });
  }, [url]);

  useEffect(() => {
    if (!imageURL) return;

    Image.getSize(
      imageURL,
      (origWidth, origHeight) => {
        let croppedWidth = cardWidth;
        const scaleFactor = croppedWidth / 1320;
        croppedWidth = Math.round(croppedWidth);

        const uncroppedHeight = Math.round(origHeight * scaleFactor);
        const croppedHeight = Math.round(1386 * scaleFactor);
        const translateY = uncroppedHeight - croppedHeight - 1;

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
  }, [imageURL, cardWidth]);

  useEffect(() => {
    if (!modalVisible || !imageURL) return;

    const imageWidthForCrop = modalWidth - 2 * modalPadding;
    Image.getSize(
      imageURL,
      (origWidth, origHeight) => {
        const scaleFactor = imageWidthForCrop / 1320;
        const croppedWidth = Math.round(imageWidthForCrop);
        const uncroppedHeight = Math.round(origHeight * scaleFactor);
        const croppedHeight = Math.round(1386 * scaleFactor);
        const translateY = (uncroppedHeight - croppedHeight) - 2 * modalPadding - 1;

        setModalCropParams({
          croppedWidth,
          croppedHeight,
          uncroppedHeight,
          translateY,
        });
      },
      (error) => {
        console.error("Error getting image size for modal:", error);
      }
    );
  }, [modalVisible, imageURL, modalWidth, modalPadding]);

  const handlePress = () => {
    setModalVisible(true);
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress}>
        <Card>
          <View style={styles.content}>
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
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={styles.emptyImage} />
            )}

            <View style={styles.textContainer}>
              <AppText
                style={[
                  styles.componentTitle,
                  { color: theme.colors.darkGrey },
                ]}
              >
                Your Garden Grew!
              </AppText>
              <AppText style={[styles.diffText, { color: theme.colors.darkGrey }]}>
                {diff}
              </AppText>
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fullScreenOverlay}>
          <View style={[styles.modalContent, { width: modalWidth, padding: modalPadding }]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <AppText style={styles.closeButtonText}>×</AppText>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <AppText style={styles.title}>Your Garden Grew!</AppText>
            </View>

            {modalCropParams && imageURL ? (
              <View
                style={[
                  styles.cropContainer,
                  {
                    width: modalCropParams.croppedWidth,
                    height: modalCropParams.croppedHeight,
                  },
                ]}
              >
                <Image
                  source={{ uri: imageURL }}
                  style={{
                    width: modalCropParams.croppedWidth,
                    height: modalCropParams.uncroppedHeight,
                    transform: [{ translateY: -modalCropParams.translateY }],
                  }}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <AppText style={[styles.diffTextModal, { color: theme.colors.darkGrey }]}>
              {diff}
            </AppText>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cropContainer: {
    overflow: "hidden",
    borderRadius: 10,
  },
  emptyImage: {
    width: 50,
    height: 50,
    backgroundColor: "#ccc",
    borderRadius: 10,
  },
  textContainer: {
    flex: 1,
  },
  componentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  diffText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "left",
  },
  fullScreenOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 15,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
  },
  titleContainer: {
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  diffTextModal: {
    fontSize: 16,
    marginTop: 16,
    lineHeight: 22,
    textAlign: "left",
  },
});

export default AmbientDisplayCard;
