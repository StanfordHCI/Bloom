import * as Sentry from "@sentry/react";

const captureError = (error: unknown, message: string) => {
    Sentry.captureException(error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(message, errorMessage);
  };

export default captureError;