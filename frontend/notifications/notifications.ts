import { eventEmitter } from "../utils/EventEmitter";
import { useEffect } from "react";

import { useNavigation } from "@react-navigation/native";
import { NavigationViews } from '../navigation/AppNavigator';
import { StackNavigationProp } from "@react-navigation/stack";

type RootNavigationProp = StackNavigationProp<NavigationViews>;

export const useNotificationListener = () => {
  const navigation = useNavigation<RootNavigationProp>();

  useEffect(() => {
    const handleNotificationOpened = (event: { action?: string }) => {
      try {
        if (event.action === "checkin") {
          navigation.navigate("CheckInFlow");
        } 
      } catch (error) {
        console.error("Error displaying alert:", error);
      }
    };

    const notificationSubscription = eventEmitter.addListener(
      "notificationOpened",
      handleNotificationOpened
    );

    return () => {
      notificationSubscription.remove();
    };
  }, []);
};
