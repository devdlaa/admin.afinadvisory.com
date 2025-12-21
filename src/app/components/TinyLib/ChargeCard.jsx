"use client"
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
} from "lucide-react";
import CustomInput from "./CustomInput";
import CustomDropdown from "./CustomDropdown";
import ActionButton from "./ActionButton";
import Avatar from "./Avatar";
import styles from "./ChargeCard.module.scss";

const ChargeCard = ({
  charge = {},
  onUpdate = () => {},
  onCancel = () => {},
  onDelete = () => {},
  isNewCharge = false,
}) => {
  const [isEditing, setIsEditing] = useState(isNewCharge);
  const [isExpanded, setIsExpanded] = useState(isNewCharge);
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
    { value: "external", label: "External Charge" },
    { value: "internal", label: "Service Fee" },
  ];

  const bearerOptions = [
    {
      value: "client",
      label: "Client Will Pay",
      icon: <UserCheck size={16} />,
    },
    { value: "company", label: "Firm Will Pay", icon: <Landmark size={16} /> },
  ];

  const paymentStatusOptions = [
    {
      value: "paid",
      label: "Paid",
      bgColor: "#dcfce7",
      txtClr: "#166534",
      icon: <BadgeCheck color="#166534" size={16} />,
    },
    {
      value: "not-paid",
      label: "Not Paid Yet",
      bgColor: "#fee2e2",
      txtClr: "#991b1b",
      icon: <RefreshCcw color="#991b1b" size={16} />,
    },
    {
      value: "written-off",
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
    // Validate required fields for new charges
    if (isNewCharge) {
      if (!formData.chargeTitle || !formData.chargeAmount) {
        alert("Please fill in Charge Title and Amount before saving.");
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
    if (window.confirm("Are you sure you want to delete this charge?")) {
      onDelete();
    }
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

  // Collapsed view - one line summary
  if (!isExpanded) {
    const statusConfig = getStatusConfig(formData.paymentStatus);
    
    return (
      <div 
        className={`${styles.chargeCard} ${styles.collapsed}`}
        onClick={() => setIsExpanded(true)}
      >
        <div className={styles.collapsedContent}>
          <div className={styles.collapsedLeft}>
            <h3 className={styles.collapsedTitle}>{formData.chargeTitle || "Untitled Charge"}</h3>
            <div className={styles.collapsedMeta}>
              <span className={styles.chargeTypeLabel}>{getChargeTypeLabel(formData.chargeType)}</span>
              <span className={styles.separator}>•</span>
              <span className={styles.bearerLabel}>{getBearerLabel(formData.whoIsBearer)}</span>
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
                  color: statusConfig.txtClr 
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
    <div className={`${styles.chargeCard} ${isNewCharge ? styles.newCharge : ""} ${styles.expanded}`}>
      {isNewCharge && <div className={styles.newBadge}>New Charge</div>}
      
      {/* Collapse button */}
      {!isEditing && (
        <button 
          className={styles.collapseBtn}
          onClick={() => setIsExpanded(false)}
          aria-label="Collapse"
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
            disabled={!isEditing}
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
            disabled={!isEditing}
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
          disabled={!isEditing}
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
          disabled={!isEditing}
        />

        <CustomDropdown
          selectedValue={formData.paymentStatus}
          options={paymentStatusOptions}
          onSelect={(option) =>
            setFormData({ ...formData, paymentStatus: option.value })
          }
          placeholder="Select status"
          label="Status"
          disabled={!isEditing}
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
          disabled={!isEditing}
        />
      </div>

      {/* Footer Section */}
      <div className={styles.footer}>
        <div className={styles.metaInfo}>
          {!isNewCharge && (
            <div className={styles.metaItem}>
              <Avatar
                src={charge.createdBy.avatar}
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
              />
              <ActionButton
                text="Update"
                icon={Edit2}
                onClick={handleEdit}
                variant="light"
                  size="small"
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
              />
              <ActionButton
                text={isNewCharge ? "Save Charge" : "Save Changes"}
                icon={Save}
                onClick={handleSave}
                variant="primary"
                       size="small"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChargeCard