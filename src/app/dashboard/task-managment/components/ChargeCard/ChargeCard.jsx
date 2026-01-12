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
} from "lucide-react";

import CustomInput from "@/app/components/TinyLib/CustomInput";
import CustomDropdown from "@/app/components/TinyLib/CustomDropdown";
import ActionButton from "@/app/components/TinyLib/ActionButton";
import Avatar from "@/app/components/newui/Avatar/Avatar";

import styles from "./ChargeCard.module.scss";
import { getProfileUrl } from "@/utils/shared/shared_util";
import ConfirmationDialog from "@/app/components/ConfirmationDialog/ConfirmationDialog";

const ChargeCard = ({
  charge = {},
  onUpdate = () => {},
  onCancel = () => {},
  onDelete = () => {},
  isNewCharge = false,
  isLoading = false,
  operationType = null, // 'adding' | 'updating' | 'deleting'
}) => {
  const [isEditing, setIsEditing] = useState(isNewCharge);
  const [isExpanded, setIsExpanded] = useState(isNewCharge);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [formData, setFormData] = useState({
    chargeTitle: charge.chargeTitle,
    chargeType: charge.chargeType,
    chargeAmount: charge.chargeAmount,
    whoIsBearer: charge.whoIsBearer,
    paymentStatus: charge.paymentStatus,
    remarks: charge.remarks,
  });

  // Start in edit mode and expanded for new charges
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
      // For new charges, call onCancel which will remove the card
      onCancel();
    } else {
      // For existing charges, just reset the form
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

  const getStatusConfig = (status) => {
    return paymentStatusOptions.find((opt) => opt.value === status);
  };

  const getBearerLabel = (bearer) => {
    return bearerOptions.find((opt) => opt.value === bearer)?.label || bearer;
  };

  const getChargeTypeLabel = (type) => {
    return chargeTypeOptions.find((opt) => opt.value === type)?.label || type;
  };

  // Show overlay when this specific charge is being processed
  const showOverlay =
    operationType === "updating" || operationType === "deleting";

  // Collapsed view - one line summary
  if (!isExpanded) {
    const statusConfig = getStatusConfig(formData.paymentStatus);

    return (
      <div
        className={`${styles.chargeCard} ${styles.collapsed}`}
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
      }`}
      style={{ position: "relative" }}
    >
      {/* Loading Overlay for updating/deleting */}
      {showOverlay && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <Loader2 size={32} className={styles.spinner} />
            <p className={styles.loadingText}>
              {operationType === "updating"
                ? "Updating charge..."
                : "Deleting charge..."}
            </p>
          </div>
        </div>
      )}

      {/* Collapse button */}
      {!isEditing && (
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
            disabled={!isEditing || showOverlay}
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
            disabled={!isEditing || showOverlay}
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
          disabled={!isEditing || showOverlay}
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
          disabled={!isEditing || showOverlay}
        />

        <CustomDropdown
          selectedValue={formData.paymentStatus}
          options={paymentStatusOptions}
          onSelect={(option) =>
            setFormData({ ...formData, paymentStatus: option.value })
          }
          placeholder="Select status"
          label="Status"
          disabled={!isEditing || showOverlay}
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
          disabled={!isEditing || showOverlay}
        />
      </div>

      {/* Footer Section */}
      <div className={styles.footer}>
        <div className={styles.metaInfo}>
          {!isNewCharge && (
            <div className={styles.metaItem}>
              <Avatar
                src={getProfileUrl(charge.createdBy.created_by_uid)}
                alt={charge.createdBy.name}
                size={36}
                fallbackText={charge.createdBy.name}
              />
              <div className={styles.metaText}>
                <span className={styles.metaLabel}>
                  Created On - <strong>{charge.createdBy.date}</strong> By
                </span>
                <span className={styles.metaName}>{charge.createdBy.name}</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {!isEditing ? (
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
      </div>
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        actionName="Delete this charge?"
        actionInfo="This action cannot be undone."
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
