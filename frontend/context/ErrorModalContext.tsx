import React, { createContext, useState, useContext } from "react";

interface ErrorModalProvider {
  isError: boolean;
  errorMessage: string | null;
  hideErrorModal: () => void;
  showErrorModal: (message: string) => void;
  showFeedbackView: () => void;
  isFeedbackVisible: boolean;
  hideFeedbackView: () => void;
}

const ErrorModalContext = createContext<ErrorModalProvider | undefined>(undefined);

export const ErrorModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);

  const showFeedbackView = () => setIsFeedbackVisible(true);
  const hideFeedbackView = () => setIsFeedbackVisible(false);

  const showErrorModal = (message: string) => {
    setErrorMessage(message);
    setIsError(true);
  };

  const hideErrorModal = () => {
    setIsError(false);
    setErrorMessage(null);
  };

  return (
    <ErrorModalContext.Provider
      value={{
        isError,
        errorMessage,
        showErrorModal,
        hideErrorModal,
        showFeedbackView,
        hideFeedbackView,
        isFeedbackVisible,
      }}
    >
      {children}
    </ErrorModalContext.Provider>
  );
};

export const useErrorModal = (): ErrorModalProvider => {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error("useErrorModal must be used within an ErrorModalProvider");
  }
  return context;
};
