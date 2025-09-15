"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  ChevronUp,
  ChevronDown,
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

const tabs = [
  { id: "all", label: "All Bookings" },
  { id: "processing", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "refund_requested", label: "Refund Requested" },
  { id: "refunded", label: "Refunded" },
];

const ServiceBookingsTable = ({ onQuickView, actionButtons = [] }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  
  // Local state for tabs and sorting
  const [activeTab, setActiveTab] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

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

  // Filter bookings based on active tab
  const filteredBookings = useMemo(() => {
    let baseBookings = isSearchActive ? searchedBookings : bookings;
    
    switch (activeTab) {
      case "processing":
        return baseBookings.filter(booking => booking.master_status === "processing");
      case "completed":
        return baseBookings.filter(booking => booking.master_status === "completed");
      case "refunded":
        return baseBookings.filter(booking => booking.master_status === "refunded");
      case "refund_requested":
        return baseBookings.filter(booking => booking.isRefundFlagged === true);
      default:
        return baseBookings;
    }
  }, [bookings, searchedBookings, isSearchActive, activeTab]);

  // Calculate counts for each tab
  const tabCounts = useMemo(() => {
    const baseBookings = isSearchActive ? searchedBookings : bookings;
    
    return {
      all: baseBookings.length,
      processing: baseBookings.filter(booking => booking.master_status === "processing").length,
      completed: baseBookings.filter(booking => booking.master_status === "completed").length,
      refunded: baseBookings.filter(booking => booking.master_status === "refunded").length,
      refund_requested: baseBookings.filter(booking => booking.isRefundFlagged === true).length,
    };
  }, [bookings, searchedBookings, isSearchActive]);

  // Sort bookings
  const sortedBookings = useMemo(() => {
    if (!sortConfig.key) return filteredBookings;

    return [...filteredBookings].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case "service_name":
          aValue = a.service_details?.service_name || "";
          bValue = b.service_details?.service_name || "";
          break;
        case "customer_name":
          aValue = `${a.user_details?.firstName || ""} ${a.user_details?.lastName || ""}`.trim();
          bValue = `${b.user_details?.firstName || ""} ${b.user_details?.lastName || ""}`.trim();
          break;
        case "plan_name":
          aValue = a.plan_details?.plan_name || "";
          bValue = b.plan_details?.plan_name || "";
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "master_status":
          aValue = a.master_status || "";
          bValue = b.master_status || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredBookings, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Render sort icon
  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp size={14} className="sort-icon inactive" />;
    }
    return sortConfig.direction === "asc" ? 
      <ChevronUp size={14} className="sort-icon active" /> : 
      <ChevronDown size={14} className="sort-icon active" />;
  };

  return (
    <div className="service-bookings-table">
      {/* Tabs Section */}
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
            <span className="tab-count">({tabCounts[tab.id] || 0})</span>
          </button>
        ))}
      </div>

      {/* Table Container with Fixed Header */}
      <div className="table-container">
        <div className="table-wrapper">
          {/* Fixed Table Header */}
          <div className="table-head">
            <div className="table-row header-row">
              <div className="table-cell booking-cell sortable" onClick={() => handleSort("service_name")}>
                <span>Service Details</span>
                {renderSortIcon("service_name")}
              </div>
              <div className="table-cell customer-cell sortable" onClick={() => handleSort("customer_name")}>
                <span>Customer</span>
                {renderSortIcon("customer_name")}
              </div>
              <div className="table-cell plan-cell sortable" onClick={() => handleSort("plan_name")}>
                <span>Plan</span>
                {renderSortIcon("plan_name")}
              </div>
              <div className="table-cell date-cell sortable" onClick={() => handleSort("created_at")}>
                <span>Date</span>
                {renderSortIcon("created_at")}
              </div>
              <div className="table-cell status-cell sortable" onClick={() => handleSort("master_status")}>
                <span>Status</span>
                {renderSortIcon("master_status")}
              </div>
              <div className="table-cell actions-cell">Actions</div>
            </div>
          </div>

          {/* Scrollable Table Body */}
          {loading ? (
            <div className="service-bookings-table">
              <div className="loading-state">
                <CircularProgress size={20} />
                <p>Loading bookings...</p>
              </div>
            </div>
          ) : sortedBookings.length <= 0 ? (
            <div className="service-bookings-table">
              <div className="empty-state">
                <p>No bookings found</p>
              </div>
            </div>
          ) : (
            <div className="table-body">
              {sortedBookings.map((booking) => {
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