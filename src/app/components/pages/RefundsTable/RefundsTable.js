import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  MoreVertical, 
  Copy, 
  RefreshCw, 
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowUpRight
} from 'lucide-react';
import './RefundsTable.scss';

import { 
  fetchRefunds,
  setRefundPagination,
  selectRefunds,
  selectIsLoadingRefunds,
  selectRefundsPagination,
  selectRefundsError
} from '@/store/slices/paymentSlice';

const RefundsTable = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const refunds = useSelector(selectRefunds);
  const loading = useSelector(selectIsLoadingRefunds);
  const pagination = useSelector(selectRefundsPagination);
  const error = useSelector(selectRefundsError);
  
  const [selectedRefunds, setSelectedRefunds] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  useEffect(() => {
    loadRefunds();
  }, [pagination.currentPage, pagination.pageSize]);

  const loadRefunds = async () => {
    const skip = (pagination.currentPage - 1) * pagination.pageSize;
    try {
      await dispatch(fetchRefunds({ 
        count: pagination.pageSize, 
        skip 
      })).unwrap();
    } catch (error) {
      console.error('Error loading refunds:', error);
    }
  };

  const formatAmount = (amount) => {
    return (amount / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      processed: 'success',
      pending: 'warning',
      failed: 'danger',
      cancelled: 'info'
    };
    return `status-badge ${statusClasses[status] || 'info'}`;
  };

  const getSpeedBadge = (speed) => {
    return speed === 'instant' ? 'speed-instant' : 'speed-normal';
  };

  const getReason = (notes) => {
    const reasons = {
      customer_request: 'Customer Request',
      duplicate_payment: 'Duplicate Payment',
      order_cancellation: 'Order Cancelled',
      processing_error: 'Processing Error',
      fraudulent_transaction: 'Fraudulent',
      other: 'Other'
    };
    return reasons[notes?.reason] || 'Not specified';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      dispatch(setRefundPagination({ currentPage: page }));
    }
  };

  const handlePageSizeChange = (size) => {
    dispatch(setRefundPagination({ 
      pageSize: size, 
      currentPage: 1 
    }));
  };

  const toggleDropdown = (refundId) => {
    setDropdownOpen(dropdownOpen === refundId ? null : refundId);
  };

  const handleViewPayment = (paymentId) => {
    console.log('View payment:', paymentId);
  };

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  if (loading && pagination.currentPage === 1) {
    return (
      <div className="refunds-table loading">
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

  if (error && !refunds?.items?.length) {
    return (
      <div className="refunds-table error">
        <div className="error-state">
          <div className="error-icon">
            <RefreshCw size={48} />
          </div>
          <h3>Failed to load refunds</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadRefunds}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const refundsData = refunds?.items || [];

  return (
    <div className="refunds-table">
      <div className="table-header">
        <div className="table-info">
          <span className="total-count">
            {refunds?.count || 0} refunds
          </span>
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
              <th>Refund ID</th>
              <th>Payment ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Speed</th>
              <th>Reason</th>
              <th>Created</th>
              <th>Processed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {refundsData.map(refund => (
              <tr key={refund.id}>
                <td>
                  <div className="refund-id">
                    <span className="id-text">{refund.id}</span>
                    <button 
                      className="copy-btn"
                      onClick={() => copyToClipboard(refund.id)}
                      title="Copy Refund ID"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </td>
                <td>
                  <div className="payment-id-cell">
                    <span 
                      className="payment-link"
                      onClick={() => handleViewPayment(refund.payment_id)}
                      title="View original payment"
                    >
                      {refund.payment_id}
                      <ArrowUpRight size={12} />
                    </span>
                  </div>
                </td>
                <td>
                  <div className="amount-cell">
                    <span className="amount">{formatAmount(refund.amount)}</span>
                  </div>
                </td>
                <td>
                  <span className={getStatusBadge(refund.status)}>
                    {refund.status}
                  </span>
                </td>
                <td>
                  <span className={`speed-badge ${getSpeedBadge(refund.speed)}`}>
                    {refund.speed}
                  </span>
                </td>
                <td>
                  <span className="reason-text">
                    {getReason(refund.notes)}
                  </span>
                </td>
                <td>
                  <span className="date">
                    {formatDate(refund.created_at)}
                  </span>
                </td>
                <td>
                  <span className="date">
                    {formatDate(refund.processed_at)}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button 
                      className="action-btn view-btn"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <div className="dropdown-container">
                      <button 
                        className="action-btn dropdown-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(refund.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {dropdownOpen === refund.id && (
                        <div className="dropdown-menu">
                          <button 
                            className="dropdown-item"
                            onClick={() => copyToClipboard(refund.id)}
                          >
                            <Copy size={14} />
                            Copy Refund ID
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => copyToClipboard(refund.payment_id)}
                          >
                            <Copy size={14} />
                            Copy Payment ID
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={() => handleViewPayment(refund.payment_id)}
                          >
                            <ArrowUpRight size={14} />
                            View Payment
                          </button>
                          <button className="dropdown-item">
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

      {refundsData.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <RefreshCw size={48} />
          </div>
          <h3>No refunds found</h3>
          <p>No refund transactions match your current filters.</p>
        </div>
      )}

      {refundsData.length > 0 && (
        <div className="table-pagination">
          <div className="pagination-info">
            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to {Math.min(pagination.currentPage * pagination.pageSize, refunds?.count || 0)} of {refunds?.count || 0}
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
              disabled={pagination.currentPage >= pagination.totalPages || loading}
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

export default RefundsTable;