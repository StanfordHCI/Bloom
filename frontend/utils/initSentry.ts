import * as Sentry from "@sentry/react-native";
import { SENTRY_DSN, USE_SENTRY } from "../config";
import { sentryNavigationIntegration } from "../../index";
import { AppState } from "react-native";

export const initSentry = (showErrorModal: (message: string) => void) => {
  if (USE_SENTRY) {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: true,
      integrations: [
        sentryNavigationIntegration,
      ],
      beforeSend(event, hint) {
        if (
          event.exception &&
          event.event_id &&
          hint &&
          hint.originalException &&
          hint.originalException != 'user submitted feedback'
        ) {
          const errorMessage: string =
            (typeof hint.originalException === "string" &&
              hint.originalException) ||
            "An unknown error occurred";
          console.log("Sending error to Sentry", hint);
          if (AppState.currentState === 'active') {
            showErrorModal(errorMessage);
          }
        }
        return event;
      },
    });
  }
};
