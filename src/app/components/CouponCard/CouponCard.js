// components/CouponCard/CouponCard.js
"use client";

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Edit,
  Trash2,
  Eye,
  Calendar,
  Percent,
  DollarSign,
  Users,
  Crown,
  Tag,
  MoreHorizontal,
  Trash,
  IndianRupee,
} from "lucide-react";
import { deleteCoupon } from "@/store/slices/couponsSlice";
import CouponDetailsModal from "../CouponDetailsModal/CouponDetailsModal.js";
import EditCouponModal from "../EditCouponModal/EditCouponModal.js";
import "./CouponCard.scss";
import { CircularProgress } from "@mui/material";

const CouponCard = ({ coupon }) => {
  const dispatch = useDispatch();
  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await dispatch(deleteCoupon(coupon._id)).unwrap();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (state) => {
    const statusConfig = {
      active: { label: "Active", class: "active" },
      inactive: { label: "Inactive", class: "inactive" },
      expired: { label: "Expired", class: "expired" },
      usedUp: { label: "Used Up", class: "used-up" },
    };

    const config = statusConfig[state] || statusConfig.inactive;
    return (
      <span className={`status-badge ${config.class}`}>{config.label}</span>
    );
  };

  const formatDate = (date) => {
    if (!date) return "No expiry";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDiscountDisplay = (discount) => {
       return discount.amount;
  };

  return (
    <>
      <div className="coupon-card">
        <div className="card-header">
          <div className="code-section">
            <div className="coupon-code">
              <Tag size={16} />
              {coupon.code}
            </div>
            {coupon.isInfluencerCoupon && (
              <div className="influencer-badge">
                <Crown size={14} />
                Influencer
              </div>
            )}
          </div>

          <div className="actions">
            <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>
              <MoreHorizontal size={20} />
            </button>

            {showMenu && (
              <div className="actions-menu">
                <button
                  onClick={() => {
                    setShowDetails(true);
                    setShowMenu(false);
                  }}
                >
                  <Eye size={16} />
                  View Details
                </button>
                <button
                  onClick={() => {
                    setShowEdit(true);
                    setShowMenu(false);
                  }}
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card-content">
          <div className="title-section">
            <h3 className="coupon-title">
              {coupon.title || "Untitled Coupon"}
            </h3>
            {getStatusBadge(coupon.state)}
          </div>

          {coupon.description && (
            <p className="coupon-description">{coupon.description}</p>
          )}

          <div className="discount-info">
            <div className="discount-amount">
              {coupon.discount.kind === "percent" ? (
                <Percent size={20} />
              ) : (
                <IndianRupee size={20} />
              )}
              <span className="amount">
                {`${getDiscountDisplay(coupon.discount)} OFF`}
              </span>
            </div>

            {coupon.discount.maxDiscount && (
              <div className="max-discount">
                Max: ₹{coupon.discount.maxDiscount}
              </div>
            )}
          </div>

          <div className="meta-info">
            <div className="meta-item">
              <Calendar size={16} />
              <span>Expires: {formatDate(coupon.expiresAt)}</span>
            </div>

            {coupon.appliesTo?.users && (
              <div className="meta-item">
                <Users size={16} />
                <span>
                  {coupon.appliesTo.users === "all"
                    ? "All Users"
                    : "New Users Only"}
                </span>
              </div>
            )}

            {coupon.linkedServices?.length > 0 && (
              <div className="meta-item">
                <Tag size={16} />
                <span>{coupon.linkedServices.length} Service(s) Linked</span>
              </div>
            )}
          </div>

          {coupon.usageLimits && (
            <div className="usage-limits">
              {coupon.usageLimits.perUser && (
                <span>Per User: {coupon.usageLimits.perUser}</span>
              )}
              {coupon.usageLimits.total && (
                <span>Total: {coupon.usageLimits.total}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showDetails && (
        <CouponDetailsModal
          coupon={coupon}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showEdit && (
        <EditCouponModal coupon={coupon} onClose={() => setShowEdit(false)} />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-confirm-modal">
            <div className="modal-header">
              <h3>Delete Coupon</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete the coupon{" "}
                <strong>"{coupon.code}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="delete-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <CircularProgress size={16} color="white" />{" "}
                    <p>Deleting...</p>
                  </>
                ) : (
                  <>
                    <Trash size={16} color="white" /> <p>Deleting</p>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CouponCard;
