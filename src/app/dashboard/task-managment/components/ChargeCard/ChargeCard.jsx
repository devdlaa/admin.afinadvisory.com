"use client";
import { useState, useEffect } from "react";
import {
  Edit2,
  Save,
  X,
  IndianRupee,
  Landmark,
  Trash2,
  UserCheck,
  BadgeCheck,
  RefreshCcw,
  DiamondMinus,
  Loader2,
  RotateCcw,
} from "lucide-react";

import CustomInput from "@/app/components/shared/TinyLib/CustomInput";
import CustomDropdown from "@/app/components/shared/TinyLib/CustomDropdown";
import ActionButton from "@/app/components/shared/TinyLib/ActionButton";

import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import styles from "./ChargeCard.module.scss";


const ChargeCard = ({
  charge = {},
  onUpdate = () => {},
  onCancel = () => {},
  onDelete = () => {},
  onRestore = () => {},
  onHardDelete = () => {},
  isNewCharge = false,
  isLoading = false,
  operationType = null,
  mode = "active", // 'active' | 'deleted'
}) => {
  const [isEditing, setIsEditing] = useState(isNewCharge);
  const [isExpanded, setIsExpanded] = useState(isNewCharge);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHardDeleteDialog, setShowHardDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [formData, setFormData] = useState({
    chargeTitle: charge.chargeTitle,
    chargeType: charge.chargeType,
    chargeAmount: charge.chargeAmount,
    whoIsBearer: charge.whoIsBearer,
    paymentStatus: charge.paymentStatus,
    remarks: charge.remarks,
  });

  const isDeletedMode = mode === "deleted";

  useEffect(() => {
    if (isNewCharge) {
      setIsEditing(true);
      setIsExpanded(true);
    }
  }, [isNewCharge]);

  const chargeTypeOptions = [
    { value: "EXTERNAL_CHARGE", label: "External Charge" },
    { value: "GOVERNMENT_FEE", label: "Government Fee" },
    { value: "SERVICE_FEE", label: "Service Fee" },
  ];

  const bearerOptions = [
    {
      value: "CLIENT",
      label: "Client Will Pay",
      icon: <UserCheck size={16} />,
    },
    { value: "FIRM", label: "Firm Will Pay", icon: <Landmark size={16} /> },
  ];

  const paymentStatusOptions = [
    {
      value: "PAID",
      label: "Paid",
      bgColor: "#dcfce7",
      txtClr: "#166534",
      icon: <BadgeCheck color="#166534" size={16} />,
    },
    {
      value: "NOT_PAID",
      label: "Not Paid Yet",
      bgColor: "#fee2e2",
      txtClr: "#991b1b",
      icon: <RefreshCcw color="#991b1b" size={16} />,
    },
    {
      value: "WRITTEN_OFF",
      label: "Written Off",
      bgColor: "#fef3c7",
      txtClr: "#92400e",
      icon: <DiamondMinus color="#92400e" size={16} />,
    },
  ];

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (isNewCharge) {
      if (!formData.chargeTitle || !formData.chargeAmount) {
        setShowValidationDialog(true);
        return;
      }
    }
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (isNewCharge) {
      onCancel();
    } else {
      setFormData({
        chargeTitle: charge.chargeTitle,
        chargeType: charge.chargeType,
        chargeAmount: charge.chargeAmount,
        whoIsBearer: charge.whoIsBearer,
        paymentStatus: charge.paymentStatus,
        remarks: charge.remarks,
      });
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleHardDelete = () => {
    setShowHardDeleteDialog(true);
  };

  const handleRestore = () => {
    setShowRestoreDialog(true);
  };

  const getStatusConfig = (status) => {
    return paymentStatusOptions.find((opt) => opt.value === status);
  };

  const getBearerLabel = (bearer) => {
    return bearerOptions.find((opt) => opt.value === bearer)?.label || bearer;
  };

  const getChargeTypeLabel = (type) => {
    return chargeTypeOptions.find((opt) => opt.value === type)?.label || type;
  };

  const showOverlay =
    operationType === "updating" ||
    operationType === "deleting" ||
    operationType === "restoring" ||
    operationType === "hard-deleting";

  // Collapsed view
  if (!isExpanded) {
    const statusConfig = getStatusConfig(formData.paymentStatus);

    return (
      <div
        className={`${styles.chargeCard} ${styles.collapsed} ${
          isDeletedMode ? styles.deletedCard : ""
        }`}
        onClick={() => !showOverlay && setIsExpanded(true)}
        style={{
          opacity: showOverlay ? 0.6 : 1,
          pointerEvents: showOverlay ? "none" : "auto",
        }}
      >
        <div className={styles.collapsedContent}>
          <div className={styles.collapsedLeft}>
            <h3 className={styles.collapsedTitle}>
              {formData.chargeTitle || "Untitled Charge"}
            </h3>
            <div className={styles.collapsedMeta}>
              <span className={styles.chargeTypeLabel}>
                {getChargeTypeLabel(formData.chargeType)}
              </span>
              <span className={styles.separator}>•</span>
              <span className={styles.bearerLabel}>
                {getBearerLabel(formData.whoIsBearer)}
              </span>
            </div>
          </div>

          <div className={styles.collapsedRight}>
            <div className={styles.collapsedAmount}>
              <IndianRupee size={16} />
              <span>{formData.chargeAmount || "0"}</span>
            </div>
            {statusConfig && (
              <div
                className={styles.collapsedStatus}
                style={{
                  backgroundColor: statusConfig.bgColor,
                  color: statusConfig.txtClr,
                }}
              >
                {statusConfig.icon}
                <span>{statusConfig.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.chargeCard} ${isNewCharge ? styles.newCharge : ""} ${
        styles.expanded
      } ${isDeletedMode ? styles.deletedCard : ""}`}
      style={{ position: "relative" }}
    >
      {/* Loading Overlay */}
      {showOverlay && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <Loader2 size={32} className={styles.spinner} />
            <p className={styles.loadingText}>
              {operationType === "updating" && "Updating charge..."}
              {operationType === "deleting" && "Deleting charge..."}
              {operationType === "restoring" && "Restoring charge..."}
              {operationType === "hard-deleting" && "Permanently deleting..."}
            </p>
          </div>
        </div>
      )}

      {/* Collapse button */}
      {!isEditing && !isDeletedMode && (
        <button
          className={styles.collapseBtn}
          onClick={() => setIsExpanded(false)}
          aria-label="Collapse"
          disabled={showOverlay}
        >
          ×
        </button>
      )}

      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <CustomInput
            value={formData.chargeTitle}
            onChange={(value) =>
              setFormData({ ...formData, chargeTitle: value })
            }
            label="Charge Title"
            placeholder="Enter charge title"
            disabled={!isEditing || showOverlay || isDeletedMode}
          />
        </div>

        <div className={styles.typeSection}>
          <CustomInput
            value={formData.chargeAmount}
            onChange={(value) =>
              setFormData({ ...formData, chargeAmount: value })
            }
            placeholder="Enter amount"
            type="text"
            icon={<IndianRupee size={18} />}
            label="Amount"
            disabled={!isEditing || showOverlay || isDeletedMode}
          />
        </div>
      </div>

      {/* Details Section */}
      <div className={styles.detailsSection}>
        <CustomDropdown
          selectedValue={formData.chargeType}
          options={chargeTypeOptions}
          onSelect={(option) =>
            setFormData({ ...formData, chargeType: option.value })
          }
          placeholder="Select charge type"
          label="Charge Type"
          disabled={!isEditing || showOverlay || isDeletedMode}
        />
        <CustomDropdown
          icon={Landmark}
          selectedValue={formData.whoIsBearer}
          options={bearerOptions}
          onSelect={(option) =>
            setFormData({ ...formData, whoIsBearer: option.value })
          }
          label="Bearer"
          placeholder="Select bearer"
          disabled={!isEditing || showOverlay || isDeletedMode}
        />

        <CustomDropdown
          selectedValue={formData.paymentStatus}
          options={paymentStatusOptions}
          onSelect={(option) =>
            setFormData({ ...formData, paymentStatus: option.value })
          }
          placeholder="Select status"
          label="Status"
          disabled={!isEditing || showOverlay || isDeletedMode}
        />
      </div>

      {/* Remarks Section */}
      <div className={styles.remarksSection}>
        <CustomInput
          value={formData.remarks}
          onChange={(value) => setFormData({ ...formData, remarks: value })}
          placeholder="Enter remarks"
          multiline={true}
          rows={3}
          label="Remarks about this Charge"
          disabled={!isEditing || showOverlay || isDeletedMode}
        />
      </div>
      <div className={styles.actions}>
        {isDeletedMode ? (
          <>
            <ActionButton
              text="Restore"
              icon={RotateCcw}
              onClick={handleRestore}
              variant="secondary"
              size="small"
              isLoading={operationType === "restoring"}
              disabled={showOverlay}
            />
            <ActionButton
              text="Delete Forever"
              icon={Trash2}
              onClick={handleHardDelete}
              variant="danger"
              size="small"
              isLoading={operationType === "hard-deleting"}
              disabled={showOverlay}
            />
          </>
        ) : !isEditing ? (
          <>
            <ActionButton
              text="Delete"
              icon={Trash2}
              onClick={handleDelete}
              variant="danger"
              size="small"
              isLoading={operationType === "deleting"}
              disabled={showOverlay}
            />
            <ActionButton
              text="Update"
              icon={Edit2}
              onClick={handleEdit}
              variant="light"
              size="small"
              disabled={showOverlay}
            />
          </>
        ) : (
          <>
            <ActionButton
              text="Cancel"
              icon={X}
              onClick={handleCancelEdit}
              variant="light"
              size="small"
              disabled={isLoading || showOverlay}
            />
            <ActionButton
              text={isNewCharge ? "Save Charge" : "Save Changes"}
              icon={Save}
              onClick={handleSave}
              variant="primary"
              size="small"
              isLoading={isLoading}
              disabled={showOverlay}
            />
          </>
        )}
      </div>
      {/* Footer Section with Enhanced Metadata */}
      <div className={styles.footer}>
        {!isNewCharge && (
          <>
            {/* Created By */}
            {charge.creator && (
              <div className={styles.metaItem}>
                <div className={styles.metaText}>
                  <span className={styles.metaLabel}>
                    Created On -{" "}
                    <strong>
                      {new Date(charge.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                  <span className={styles.metaName}>{charge.creator.name}</span>
                
                </div>
              </div>
            )}

            {/* Updated By - Only show if different from creator and exists */}
            {charge.updater && !isDeletedMode && charge.updater.id && (
              <div className={styles.metaItem}>
                <div className={styles.metaText}>
                  <span className={styles.metaLabel}>
                    Updated On -{" "}
                    <strong>
                      {new Date(charge.updated_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                  <span className={styles.metaName}>{charge.updater.name}</span>
                 
                </div>
              </div>
            )}

            {/* Deleted By - Only in deleted mode */}
            {isDeletedMode && charge.deleter && (
              <div className={`${styles.metaItem} ${styles.metaItemDeletion}`}>
                <div className={styles.metaText}>
                  <span
                    className={`${styles.metaLabel} ${styles.metaLabelDanger}`}
                  >
                    Deleted On -{" "}
                    <strong>
                      {new Date(charge.deleted_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                  <span className={styles.metaName}>{charge.deleter.name}</span>
                 
                </div>
              </div>
            )}

            {/* Restored By - Show if charge was restored */}
            {charge.restorer && !isDeletedMode && (
              <div className={`${styles.metaItem} ${styles.metaItemSuccess}`}>
                <div className={styles.metaText}>
                  <span
                    className={`${styles.metaLabel} ${styles.metaLabelSuccess}`}
                  >
                    Restored On -{" "}
                    <strong>
                      {new Date(charge.updated_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                  <span className={styles.metaName}>
                    {charge.restorer.name}
                  </span>
                
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        actionName="Delete this charge?"
        actionInfo="This charge will be moved to deleted charges. You can restore it later."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          onDelete();
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <ConfirmationDialog
        isOpen={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        actionName="Restore this charge?"
        actionInfo="This charge will be moved back to active charges and will be included in calculations."
        confirmText="Restore Charge"
        cancelText="Cancel"
        variant="success"
        onConfirm={async () => {
          onRestore();
          setShowRestoreDialog(false);
        }}
        onCancel={() => setShowRestoreDialog(false)}
      />

      <ConfirmationDialog
        isOpen={showHardDeleteDialog}
        onClose={() => setShowHardDeleteDialog(false)}
        actionName="Permanently delete this charge?"
        actionInfo="This action cannot be undone. The charge will be permanently removed from the database."
        confirmText="Permanently Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          onHardDelete();
          setShowHardDeleteDialog(false);
        }}
        onCancel={() => setShowHardDeleteDialog(false)}
      />

      <ConfirmationDialog
        isOpen={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        actionName="Missing required fields"
        actionInfo="Please fill in Charge Title and Amount before saving."
        confirmText="OK"
        cancelText=""
        variant="warning"
        onConfirm={() => {
          setShowValidationDialog(false);
        }}
      />
    </div>
  );
};

export default ChargeCard;
