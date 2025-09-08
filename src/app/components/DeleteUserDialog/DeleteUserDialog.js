import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { deleteUser } from "@/store/slices/userSlice";
import "./DeleteUserDialog.scss";

const DeleteUserDialog = ({ open, onClose, user }) => {
  const [confirmText, setConfirmText] = useState("");
  const dispatch = useDispatch();

  const { deleting, deleteError, deletedUser } = useSelector(
    (state) => state.user
  );

  const handleDelete = () => {
    if (!user?.id) return;
    dispatch(deleteUser({ userId: user.id }));
  };

  // Auto-close the dialog when user is deleted successfully
  useEffect(() => {
    if (deletedUser && deletedUser.userId === user?.id) {
      setConfirmText("");
      onClose();
    }
  }, [deletedUser, user?.id, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !deleting) {
      onClose();
    }
  };

  const isConfirmed = confirmText.toLowerCase() === "delete";

  if (!open || !user) return null;

  return (
    <div className="ud-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="ud-delete-dialog">
        {/* Header */}
        <div className="ud-dialog-header">
          <div className="ud-dialog-title">
            <Trash2 className="ud-title-icon" />
            Delete User Account
          </div>
          <button
            className="ud-close-button"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="ud-delete-content">
          {/* Warning */}
          <div className="ud-warning-section">
            <div className="ud-warning-icon">
              <AlertTriangle size={48} />
            </div>
            <div className="ud-warning-text">
              <h3>Are you absolutely sure?</h3>
              <p>
                This action cannot be undone. This will permanently delete the
                user account and remove all associated data from our servers.
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="ud-user-info">
            <div className="ud-user-avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="ud-user-details">
              <h4>{user.name}</h4>
              <p>{user.email}</p>
              <div className="ud-user-meta">
                <span className="ud-employee-code">{user.userCode}</span>
                <span className="ud-department">{user.department}</span>
                <span className={`ud-status ud-status-${user.status}`}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Consequences */}
          <div className="ud-consequences">
            <h4>This will result in:</h4>
            <ul>
              <li>Immediate revocation of all system access</li>
              <li>Permanent deletion of user profile and preferences</li>
              <li>Loss of all user-specific data and settings</li>
              <li>Removal from all assigned projects and teams</li>
              {user.role === "admin" && (
                <li className="ud-critical">
                  Loss of administrative privileges and managed resources
                </li>
              )}
            </ul>
          </div>

          {/* Confirmation */}
          <div className="ud-confirmation-section">
            <label className="ud-confirmation-label">
              Please type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="ud-confirmation-input"
              placeholder="Type DELETE to confirm"
              disabled={deleting}
            />
          </div>

          {/* Error message */}
          {deleteError && (
            <div className="ud-error-message">
              {deleteError}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ud-form-actions">
          <button
            className="ud-cancel-btn"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="ud-delete-btn"
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
          >
            {deleting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="ud-loading-spinner"
              />
            ) : (
              <Trash2 size={16} />
            )}
            {deleting ? "Deleting User..." : "Delete User Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserDialog;
