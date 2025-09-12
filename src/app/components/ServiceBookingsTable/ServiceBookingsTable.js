"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Eye,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Check,
  Mail,
} from "lucide-react";

import {
  selectBooking,
  clearSelection,
  selectBookingsStats,
  selectActiveStates,
  selectLoadingStates,
} from "@/store/slices/servicesSlice";
import "./ServiceBookingsTable.scss";
import { truncateText } from "@/utils/utils";
import { CircularProgress } from "@mui/material";

const statusConfig = {
  processing: { label: "Processing", icon: CheckCircle, color: "success" },
  payment_pending: {
    label: "Payment Pending",
    icon: AlertCircle,
    color: "warning",
  },
  completed: { label: "Completed", icon: AlertCircle, color: "success" },
  refunded: { label: "Refunded", icon: XCircle, color: "error" },
};

const ServiceBookingsTable = ({ onQuickView, actionButtons = [] }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  // Redux selectors
  const bookings = useSelector((state) => state.services.bookings);
  const searchedBookings = useSelector(
    (state) => state.services.searchedBookings
  );

  const { selectedCount } = useSelector(selectBookingsStats);
  const { loading, searchLoading, exportLoading } =
    useSelector(selectLoadingStates);
  const { isSearchActive, isFilterActive } = useSelector(selectActiveStates);

  const defaultActions = [
    {
      text: "Quick View",
      icon: Eye,
      onClick: (booking) => onQuickView(booking),
    },
    {
      text: "Edit",
      icon: Edit3,
      onClick: (booking) => {
        dispatch(selectBooking(booking.id));
        if (booking.id) {
          router.push(`/dashboard/service-bookings/${booking.id}`);
        }
      },
    },
  ];

  const actions = actionButtons.length > 0 ? actionButtons : defaultActions;

  // Handle individual checkbox selection
  const handleSelectBooking = (bookingId) => {
    dispatch(selectBooking(bookingId));
  };

  // Handle select all checkbox
  const handleSelectAll = () => {};

  const getStatusClass = (status) => {
    return `status-badge status-${statusConfig[status]?.color || "default"}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  let rendred_bookings = [];
  if (isSearchActive) {
    rendred_bookings = searchedBookings;
  } else {
    rendred_bookings = bookings;
  }

  return (
    <div className="service-bookings-table">
      {/* Table Container with Fixed Header */}
      <div className="table-container">
        <div className="table-wrapper">
          {/* Fixed Table Header */}
          <div className="table-head">
            <div className="table-row header-row">
              <div className="table-cell booking-cell">Service Details</div>
              <div className="table-cell customer-cell">Customer</div>
              <div className="table-cell plan-cell">Plan</div>
              <div className="table-cell date-cell">Date</div>
              <div className="table-cell status-cell">Status</div>

              <div className="table-cell actions-cell">Actions</div>
            </div>
          </div>

          {/* Scrollable Table Body */}
          {loading ? (
            <>
              <div className="service-bookings-table">
                <div className="loading-state">
                  <CircularProgress size={20} />
                  <p>Loading bookings...</p>
                </div>
              </div>
            </>
          ) : rendred_bookings.length <= 0 ? (
            <>
              <div className="service-bookings-table">
                <div className="empty-state">
                  <p>No bookings found</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="table-body">
                {rendred_bookings.map((booking) => {
                  const StatusIcon =
                    statusConfig[booking.master_status]?.icon || AlertCircle;

                  return (
                    <div key={booking.id} className={`table-row data-row `}>
                      {/* Service Details */}
                      <div className="table-cell booking-cell">
                        <div className="booking-info">
                          <div className="service-name">
                            {truncateText(
                              booking.service_details.service_name,
                              45
                            )}
                          </div>
                          <div className="booking-details">
                            <span className="booking-id">
                              {booking.service_booking_id.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="table-cell customer-cell">
                        <div className="customer-info">
                          <div className="customer-main">
                            <div>
                              <div className="customer-name">
                                {booking.user_details.firstName}{" "}
                                {booking.user_details.lastName}
                              </div>
                              <div className="customer-contact">
                                <Phone size={12} />
                                <span>{booking.user_details.phone}</span>
                              </div>
                            </div>
                          </div>
                          <div className="customer-address">
                            <Mail size={12} />
                            <span>{booking.user_details.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Plan */}
                      <div className="table-cell plan-cell">
                        <div className="plan-info">
                          <div className="plan-name">
                            <span className="plan-badge">
                              {booking.plan_details.plan_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/*Date */}
                      <div className="table-cell date-cell">
                        <div className="created-date">
                          <Calendar size={16} />
                          <span>{formatDate(booking.created_at)}</span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="table-cell status-cell">
                        <div className={getStatusClass(booking.master_status)}>
                          <StatusIcon size={14} />
                          <span>
                            {statusConfig[booking.master_status]?.label}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="table-cell actions-cell">
                        <div className="actions-container">
                          {actions.map((action, index) => (
                            <button
                              key={index}
                              className="action-btn"
                              onClick={() => action.onClick(booking)}
                              title={action.text}
                            >
                              <action.icon size={16} />
                              <span>{action.text}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Selection Info Footer */}
      {selectedCount > 0 && (
        <div className="selection-footer">
          <span>{selectedCount} booking(s) selected</span>
          <button
            className="clear-selection"
            onClick={() => dispatch(clearSelection())}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceBookingsTable;
