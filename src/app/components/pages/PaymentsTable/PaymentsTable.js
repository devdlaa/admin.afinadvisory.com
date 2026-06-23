import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  MoreVertical,
  Copy,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import "./PaymentsTable.scss";

import {
  fetchPayments,
  setPaymentPagination,
  selectPayments,
  selectIsLoadingPayments,
  selectPaymentsPagination,
  selectPaymentsError,
} from "@/store/slices/paymentSlice";

const PaymentsTable = ({ onCreateRefund }) => {
  const dispatch = useDispatch();

  // Redux state
  const payments = useSelector(selectPayments);
  const loading = useSelector(selectIsLoadingPayments);
  const pagination = useSelector(selectPaymentsPagination);
  const error = useSelector(selectPaymentsError);

  const [selectedPayments, setSelectedPayments] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  useEffect(() => {
    // Load payments when pagination changes
    loadPayments();
  }, [pagination.currentPage, pagination.pageSize]);

  const loadPayments = async () => {
    const skip = (pagination.currentPage - 1) * pagination.pageSize;
    try {
      await dispatch(
        fetchPayments({
          count: pagination.pageSize,
          skip,
        })
      ).unwrap();
    } catch (error) {
      console.error("Error loading payments:", error);
    }
  };

  const formatAmount = (amount) => {
    return (amount / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      captured: "success",
      authorized: "warning",
      failed: "danger",
      refunded: "info",
    };
    return `status-badge ${statusClasses[status] || "info"}`;
  };

  const getMethodBadge = (method) => {
    const methodNames = {
      card: "Card",
      upi: "UPI",
      netbanking: "Net Banking",
      wallet: "Wallet",
      emi: "EMI",
    };
    return methodNames[method] || method.toUpperCase();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      dispatch(setPaymentPagination({ currentPage: page }));
    }
  };

  const handlePageSizeChange = (size) => {
    dispatch(
      setPaymentPagination({
        pageSize: size,
        currentPage: 1,
      })
    );
  };

  const toggleDropdown = (paymentId) => {
    setDropdownOpen(dropdownOpen === paymentId ? null : paymentId);
  };

  const openinRazorapy = (pid) => {
    let payment_link = `https://dashboard.razorpay.com/app/payments/${pid}`;
    window.open(payment_link, "_blank");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    if (dropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [dropdownOpen]);

  if (loading && pagination.currentPage === 1) {
    return (
      <div className="payments-table loading">
        <div className="table-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !payments?.items?.length) {
    return (
      <div className="payments-table error">
        <div className="error-state">
          <div className="error-icon">
            <RefreshCw size={48} />
          </div>
          <h3>Failed to load payments</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadPayments}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const paymentsData = payments?.items || [];

  return (
    <div className="payments-table">
      <div className="table-header">
        <div className="table-info">
          {loading && (
            <span className="loading-indicator">
              <RefreshCw size={12} className="spinning" />
              Loading...
            </span>
          )}
        </div>
        <div className="table-controls">
          <select
            value={pagination.pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="page-size-select"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Method</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paymentsData.map((payment) => (
              <tr key={payment.id}>
                <td>
                  <div className="payment-id">
                    <span className="id-text">{payment.id}</span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(payment.id)}
                      title="Copy Payment ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </td>
                <td>
                  <div className="amount-cell">
                    <span className="amount">
                      {formatAmount(payment.amount)}
                    </span>
                    {payment.fee && (
                      <span className="fee">
                        Fee: {formatAmount(payment.fee)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={getStatusBadge(payment.status)}>
                    {payment.status}
                  </span>
                </td>
                <td>
                  <span className="method-badge">
                    {getMethodBadge(payment.method)}
                  </span>
                </td>
                <td>
                  <div className="customer-info">
                    <div className="email">{payment.email}</div>
                    <div className="contact">{payment.contact}</div>
                  </div>
                </td>
                <td>
                  <span className="date">{formatDate(payment.created_at)}</span>
                </td>
                <td>
                  <div className="actions-cell">
                    <div className="dropdown-container">
                      <button
                        className="action-btn dropdown-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(payment.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {dropdownOpen === payment.id && (
                        <div className="dropdown-menu">
                          <button
                            className="dropdown-item"
                            onClick={() => copyToClipboard(payment.id)}
                          >
                            <Copy size={14} />
                            Copy ID
                          </button>
                          <button
                            onClick={() => openinRazorapy(payment.id)}
                            className="dropdown-item"
                          >
                            <RefreshCw size={14} />
                            Create Refund
                          </button>
                          <button
                            onClick={() => openinRazorapy(payment.id)}
                            className="dropdown-item"
                          >
                            <ExternalLink size={14} />
                            View on Razorpay
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paymentsData.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <RefreshCw size={48} />
          </div>
          <h3>No payments found</h3>
          <p>No payment transactions match your current filters.</p>
        </div>
      )}

      {paymentsData.length > 0 && (
        <div className="table-pagination">
          <div className="pagination-info">
            Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(
              pagination.currentPage * pagination.pageSize,
              payments?.count || 0
            )}{" "}
            of {payments?.count || 0}
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1 || loading}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="page-info">
              {pagination.currentPage} of {pagination.totalPages || 1}
            </span>
            <button
              className="btn btn-sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={
                pagination.currentPage >= pagination.totalPages || loading
              }
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTable;
