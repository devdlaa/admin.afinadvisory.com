"use client";
import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import "./ConfirmationDialog.scss";

const ConfirmationDialog = ({
  isOpen,
  onClose,
  actionName,
  actionInfo = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default", // default, danger, warning
  isCritical = false,
  criticalConfirmWord = "DELETE", // Word user must type to confirm
  onConfirm = () => {},
  onCancel = () => {},
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setConfirmInput("");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onCancel();
      handleClose();
    }
  };

  const handleConfirm = async () => {
    setLoading(true);

    try {
      await onConfirm();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if confirm button should be disabled
  const isConfirmDisabled = () => {
    if (loading) return true;
    if (isCritical && confirmInput !== criticalConfirmWord) return true;
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="confirmation-overlay">
      <div className="confirmation-dialog">
        <div className="confirmation-header">
          <div className="confirmation-title">Confirm Action</div>
          <button
            className="confirmation-close-btn"
            onClick={handleClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="confirmation-content">
          <div className="confirmation-step">
            <div className={`confirmation-icon confirmation-icon-${variant}`}>
              <AlertTriangle size={24} />
            </div>

            <div className="confirmation-message">
              <p className="confirmation-action">{actionName}</p>
              {actionInfo && <p className="confirmation-info">{actionInfo}</p>}
            </div>

            {isCritical && (
              <div className="confirmation-critical">
                <label className="confirmation-critical-label">
                  Type <strong>{criticalConfirmWord}</strong> to confirm the action.
                </label>
                <input
                  type="text"
                  className="confirmation-critical-input"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={criticalConfirmWord}
                  disabled={loading}
                  autoFocus
                />
              </div>
            )}

            <div className="confirmation-actions">
              <button
                className="confirmation-btn confirmation-btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                {cancelText}
              </button>
              <button
                className={`confirmation-btn confirmation-btn-${variant}`}
                onClick={handleConfirm}
                disabled={isConfirmDisabled()}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;