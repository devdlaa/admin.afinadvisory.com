"use client";
import React, { useState } from "react";
import styles from "./CopyButton.module.scss";

const CopyButton = ({
  value = "",
  size = "mid",
  icon = true,
  children,
  rootClass = "",
  onCopy,
  successDuration = 2000,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.(value);

      setTimeout(() => {
        setCopied(false);
      }, successDuration);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const CopyIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );

  const CheckIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${styles.copyButton} ${styles[size]} ${
        copied ? styles.copied : ""
      } ${rootClass}`}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {icon && (
        <span className={styles.icon}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </span>
      )}
      {children && <span className={styles.text}>{children}</span>}
      {!children && !icon && (copied ? "Copied!" : "Copy")}
    </button>
  );
};

export default CopyButton;
