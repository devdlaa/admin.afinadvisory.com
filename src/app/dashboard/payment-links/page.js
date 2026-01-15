"use client";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";

import BookingPaymentModal from "@/app/components/pages/BookingPaymentModal/BookingPaymentModal";
import {
  Search,
  X,
  Eye,
  Copy,
  ExternalLink,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  PlusCircleIcon,
} from "lucide-react";
import "./PaymentLinks.scss";

import {
  fetchPaymentLinks,
  setActiveTab,
  setSearchTerm,
  clearSearch,
  openLinkDialog,
  closeLinkDialog,
  selectCurrentDisplayData,
  selectActiveTab,
  selectSearchTerm,
  selectIsSearchActive,
  selectShowLinkDialog,
  selectSelectedLink,
  selectHasMore,
  selectCursor,
  selectLoading,
  selectLoadingMore,
  selectError,
  selectTabCounts,
} from "@/store/slices/paymentLinksPageSlice";

const PaymentLinks = () => {
  const dispatch = useDispatch();
  const [copySuccess, setCopySuccess] = useState(false);
  const [addNewPayment, setAddNewPayment] = useState(false);
  // Selectors
  const currentDisplayData = useSelector(selectCurrentDisplayData);
  const activeTab = useSelector(selectActiveTab);
  const searchTerm = useSelector(selectSearchTerm);
  const isSearchActive = useSelector(selectIsSearchActive);
  const showLinkDialog = useSelector(selectShowLinkDialog);
  const selectedLink = useSelector(selectSelectedLink);
  const hasMore = useSelector(selectHasMore);
  const cursor = useSelector(selectCursor);
  const loading = useSelector(selectLoading);
  const loadingMore = useSelector(selectLoadingMore);
  const error = useSelector(selectError);
  const tabCounts = useSelector(selectTabCounts);

  // Load initial data
  useEffect(() => {
    dispatch(fetchPaymentLinks({ limit: 20 }));
  }, [dispatch]);

  // Tab configuration
  const tabs = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "created", label: "Created", count: tabCounts.created },
    { key: "paid", label: "Paid", count: tabCounts.paid },
    { key: "expired", label: "Expired", count: tabCounts.expired },
    { key: "failed", label: "Failed", count: tabCounts.failed },
  ];

  // Get status icon and color
  const getStatusConfig = (status) => {
    switch (status) {
      case "paid":
        return {
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-100",
        };
      case "created":
        return { icon: Clock, color: "text-blue-600", bg: "bg-blue-100" };
      case "expired":
        return {
          icon: AlertCircle,
          color: "text-yellow-600",
          bg: "bg-yellow-100",
        };
      case "failed":
        return { icon: XCircle, color: "text-red-600", bg: "bg-red-100" };
      default:
        return { icon: Clock, color: "text-gray-600", bg: "bg-gray-100" };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  // Format amount
  const formatAmount = (amount) => {
    if (!amount) return "N/A";
    return `₹${(amount / 1).toLocaleString("en-IN")}`;
  };

  // Handle tab change
  const handleTabChange = (tabKey) => {
    dispatch(setActiveTab(tabKey));
  };

  // Handle search
  const handleSearchChange = (e) => {
    dispatch(setSearchTerm(e.target.value));
  };

  function toReadableDate(timestamp) {
    if (!timestamp || typeof timestamp._seconds !== "number") return null;

    // Firestore timestamp _seconds is in Unix seconds → convert to milliseconds
    const date = new Date(
      timestamp._seconds * 1000 + Math.floor(timestamp._nanoseconds / 1e6)
    );

    // Return a readable string (you can format as needed)
    return date.toLocaleString(); // e.g. "9/7/2025, 10:22:28 AM"
  }
  // Clear search
  const handleClearSearch = () => {
    dispatch(clearSearch());
  };

  // Load more data
  const handleLoadMore = () => {
    if (hasMore && cursor && !loadingMore) {
      dispatch(
        fetchPaymentLinks({
          limit: 20,
          cursor,
          append: true,
        })
      );
    }
  };

  // Show link details
  const handleShowDetails = (link) => {
    dispatch(openLinkDialog(link));
  };
  const handleAddNewBooking = () => {
    setAddNewPayment(true);
  };
  // Close dialog
  const handleCloseDialog = () => {
    dispatch(closeLinkDialog());
  };

  // Copy link to clipboard
  const handleCopyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ");
    }
  };

  // Get current tab display

  if (loading) {
    return (
      <div className="payment-links-page">
        <div className="loading-container">
          <Loader2 className="animate-spin" size={40} />
          <p>Loading payment links...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-links-page">
      <BookingPaymentModal
        isOpen={addNewPayment}
        onClose={() => setAddNewPayment(false)}
      />
      <div className="page-header">
        <h1>Payment Links</h1>
        <div className="payment_links_page_wrapper">
          <button
            className="create_new_link_btn"
            onClick={() => setAddNewPayment(true)}
            disabled={null}
          >
            <PlusCircleIcon size={18} />
            Create Payment Link
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {currentDisplayData.length === 0 ? (
          <div className="empty-state">
            <p>No payment links found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="payment-links-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Customer Name</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentDisplayData.map((link) => {
                  const statusConfig = getStatusConfig(link.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={link.id}>
                      <td>
                        <div className={`status-badge ${statusConfig.bg}`}>
                          <StatusIcon
                            size={14}
                            className={statusConfig.color}
                          />
                          <span className={`status-text ${statusConfig.color}`}>
                            {link.status?.toUpperCase() || "UNKNOWN"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <code className="link-id">
                          {link?.notes?.user?.email}
                        </code>
                      </td>
                      <td>
                        <code className="razorpay-id">
                          {`${link?.notes?.user?.firstName} ${link?.notes?.user?.lastName}` ||
                            "N/A"}
                        </code>
                      </td>
                      <td className="amount-cell">
                        {formatAmount(link?.notes?.payment?.finalPayment)}
                      </td>
                      <td className="date-cell">
                        {toReadableDate(link.created_at)}
                      </td>
                      <td>
                        <button
                          onClick={() => handleShowDetails(link)}
                          className="action-btn show-btn"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More */}
        {hasMore && !isSearchActive && (
          <div className="load-more-container">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="load-more-btn"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Link Details Dialog */}
      {showLinkDialog && selectedLink && (
        <div className="dialog-overlay" onClick={handleCloseDialog}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>Payment Link Details</h3>
              <button onClick={handleCloseDialog} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="dialog-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Status</label>
                  <div className="status-value">
                    {(() => {
                      const statusConfig = getStatusConfig(selectedLink.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div className={`status-badge ${statusConfig.bg}`}>
                          <StatusIcon
                            size={16}
                            className={statusConfig.color}
                          />
                          <span className={statusConfig.color}>
                            {selectedLink.status?.toUpperCase() || "UNKNOWN"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="detail-item">
                  <label>Email</label>
                  <code>{selectedLink.notes?.user?.email}</code>
                </div>

                <div className="detail-item">
                  <label>Razorpay ID</label>
                  <code>{selectedLink.razorpay_id || "N/A"}</code>
                </div>
                  <div className="grid_">
                        <div className="detail-item">
                  <label>Amount</label>
                  <span className="amount-large">
                    {formatAmount(selectedLink.notes?.payment?.finalPayment)}
                  </span>
                </div>

                <div className="detail-item">
                  <label>Created</label>
                  <span>{toReadableDate(selectedLink.created_at)}</span>
                </div>
                  </div>
            

                {selectedLink.expire_by && (
                  <div className="detail-item">
                    <label>Expires</label>
                    <span>{formatDate(selectedLink.expire_by)}</span>
                  </div>
                )}

                {selectedLink.short_url && (
                  <div className="detail-item full-width">
                    <label>Payment Link</label>
                    <div className="link-container">
                      <input
                        type="text"
                        value={selectedLink.short_url}
                        readOnly
                        className="link-input"
                      />
                      <div className="link-actions">
                        <button
                          onClick={() => handleCopyLink(selectedLink.short_url)}
                          className="copy-btn"
                          title="Copy Link"
                        >
                          <Copy size={16} />
                          {copySuccess ? "Copied!" : "Copy"}
                        </button>
                        <a
                          href={selectedLink.short_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="open-btn"
                          title="Open Link"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentLinks;
