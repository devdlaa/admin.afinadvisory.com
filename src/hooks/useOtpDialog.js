import { useState } from "react";

export const useOtpDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({});

  const openOtpDialog = (dialogConfig) => {
    setConfig(dialogConfig);
    setIsOpen(true);
  };

  const closeOtpDialog = () => {
    setIsOpen(false);
    setConfig({});
  };

  return {
    isOpen,
    config,
    openOtpDialog,
    closeOtpDialog,
  };
};
