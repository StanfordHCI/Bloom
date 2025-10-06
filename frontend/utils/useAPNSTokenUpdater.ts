import { useEffect } from "react";
import { NativeModules } from "react-native";

type NotificationBridgeType = {
  handleNotificationsAllowed: () => Promise<void>;
  verifyAndStoreAPNSToken: () => Promise<void>;
};

const {NotificationBridge } = NativeModules as { NotificationBridge: NotificationBridgeType };

export const useAPNSTokenUpdater = () => {

  useEffect(() => {
    const updateAPNSToken = async () => {
      try {
        await NotificationBridge.verifyAndStoreAPNSToken();
      } catch (error) {
        console.error("Error updating APNS token", error);
      }
    };

    void updateAPNSToken();
  }, []);
};
