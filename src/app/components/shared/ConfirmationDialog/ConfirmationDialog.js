"use client";
import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import { fetchUsers } from "@/store/slices/userSlice";
import "./ConfirmationDialog.scss";

const ConfirmationDialog = ({
  isOpen,
  onClose,
  actionName,
  actionInfo = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isCritical = false,
  criticalConfirmWord = "DELETE",
  requireTotp = false,
  onConfirm = () => {},
  onCancel = () => {},
}) => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  // TOTP state
  const [selectedAuthorizerId, setSelectedAuthorizerId] = useState("");
  const [totpCode, setTotpCode] = useState("");

  // Users from redux
  const users = useSelector((state) => state.user.users);
  const usersLoading = useSelector((state) => state.user.loading);

  // Filter only SUPER_ADMINs
  const superAdmins = users.filter(
    (u) => u.admin_role === "SUPER_ADMIN" && u.status === "ACTIVE",
  );

  // Fetch users only if requireTotp and no users loaded yet
  useEffect(() => {
    if (isOpen && requireTotp && users.length === 0) {
      dispatch(fetchUsers({ status: "ACTIVE", limit: 100 }));
    }
  }, [isOpen, requireTotp, users.length, dispatch]);

  // Reset all state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setConfirmInput("");
      setSelectedAuthorizerId("");
      setTotpCode("");
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!loading) onClose();
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
      // Pass totp data up to onConfirm if requireTotp
      await onConfirm(
        requireTotp
          ? { authorizer_id: selectedAuthorizerId, totp_code: totpCode }
          : undefined,
      );
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const isConfirmDisabled = () => {
    if (loading) return true;
    if (isCritical && confirmInput !== criticalConfirmWord) return true;
    if (requireTotp && (!selectedAuthorizerId || totpCode.length !== 6))
      return true;
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

            {/* isCritical — type word to confirm — independent */}
            {isCritical && (
              <div className="confirmation-critical">
                <label className="confirmation-critical-label">
                  Type <strong>{criticalConfirmWord}</strong> to confirm the
                  action.
                </label>
                <input
                  type="text"
                  className="confirmation-critical-input"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={criticalConfirmWord}
                  disabled={loading}
                  autoFocus={!requireTotp}
                />
              </div>
            )}

            {/* requireTotp — super admin selector + totp input — independent */}
            {requireTotp && (
              <div className="confirmation-totp">
                <div className="confirmation-totp__header">
                  <ShieldCheck size={16} />
                  <span>Super Admin Authorization Required</span>
                </div>

                <div className="confirmation-totp__field">
                  <label className="confirmation-totp__label">
                    Select Authorizing Super Admin
                  </label>
                  {usersLoading ? (
                    <div className="confirmation-totp__loading">
                      <Loader2 size={14} className="spin" />
                      <span>Loading admins...</span>
                    </div>
                  ) : (
                    <select
                      className="confirmation-totp__select"
                      value={selectedAuthorizerId}
                      onChange={(e) => setSelectedAuthorizerId(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">— Select Super Admin —</option>
                      {superAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="confirmation-totp__field">
                  <label className="confirmation-totp__label">
                    Enter their Authenticator Code
                  </label>
                  <input
                    type="text"
                    className="confirmation-totp__input"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="6-digit code"
                    disabled={loading || !selectedAuthorizerId}
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
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
