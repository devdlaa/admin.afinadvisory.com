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
  Download,
  Calendar
} from 'lucide-react';
import './SettlementsTable.scss';

import { 
  fetchSettlements,
  fetchSettlementDetails,
  setSettlementPagination,
  selectSettlements,
  selectIsLoadingSettlements,
  selectSettlementsPagination,
  selectSettlementsError
} from '@/store/slices/paymentSlice';

const SettlementsTable = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const settlements = useSelector(selectSettlements);
  const loading = useSelector(selectIsLoadingSettlements);
  const pagination = useSelector(selectSettlementsPagination);
  const error = useSelector(selectSettlementsError);
  
  const [selectedSettlements, setSelectedSettlements] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  useEffect(() => {
    loadSettlements();
  }, [pagination.currentPage, pagination.pageSize]);

  const loadSettlements = async () => {
    const skip = (pagination.currentPage - 1) * pagination.pageSize;
    try {
      await dispatch(fetchSettlements({ 
        count: pagination.pageSize, 
        skip 
      })).unwrap();
    } catch (error) {
      console.error('Error loading settlements:', error);
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
      in_process: 'warning',
      created: 'info',
      failed: 'danger',
      cancelled: 'secondary'
    };
    
    const statusLabels = {
      processed: 'Processed',
      in_process: 'In Process',
      created: 'Created',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };

    return {
      class: `status-badge ${statusClasses[status] || 'info'}`,
      label: statusLabels[status] || status
    };
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      dispatch(setSettlementPagination({ currentPage: page }));
    }
  };

  const handlePageSizeChange = (size) => {
    dispatch(setSettlementPagination({ 
      pageSize: size, 
      currentPage: 1 
    }));
  };

  const toggleDropdown = (settlementId) => {
    setDropdownOpen(dropdownOpen === settlementId ? null : settlementId);
  };

  const handleViewDetails = async (settlement) => {
    try {
      await dispatch(fetchSettlementDetails(settlement.id)).unwrap();
      // You can open a modal or navigate to details page
      console.log('Settlement details loaded for:', settlement.id);
    } catch (error) {
      console.error('Error loading settlement details:', error);
    }
  };

  const handleDownloadReport = (settlement) => {
    console.log('Download report for:', settlement.id);
    // Implement download functionality
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
      <div className="settlements-table loading">
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

  if (error && !settlements?.items?.length) {
    return (
      <div className="settlements-table error">
        <div className="error-state">
          <div className="error-icon">
            <Calendar size={48} />
          </div>
          <h3>Failed to load settlements</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadSettlements}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const settlementsData = settlements?.items || [];

  return (
    <div className="settlements-table">
      <div className="table-header">
        <div className="table-info">
          <span className="total-count">
            {settlements?.count || 0} settlements
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
              <th>Settlement ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Fees & Tax</th>
              <th>UTR</th>
              <th>Created</th>
              <th>Processed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {settlementsData.map(settlement => {
              const statusInfo = getStatusBadge(settlement.status);
              return (
                <tr key={settlement.id}>
                  <td>
                    <div className="settlement-id">
                      <span className="id-text">{settlement.id}</span>
                      <button 
                        className="copy-btn"
                        onClick={() => copyToClipboard(settlement.id)}
                        title="Copy Settlement ID"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="amount-cell">
                      <span className="amount">{formatAmount(settlement.amount)}</span>
                      <span className="net-amount">
                        Net: {formatAmount(settlement.amount - (settlement.fees || 0) - (settlement.tax || 0))}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={statusInfo.class}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td>
                    <div className="fees-cell">
                      <span className="fees">Fees: {formatAmount(settlement.fees || 0)}</span>
                      <span className="tax">Tax: {formatAmount(settlement.tax || 0)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="utr-cell">
                      {settlement.utr ? (
                        <div className="utr-value">
                          <span className="utr-text">{settlement.utr}</span>
                          <button 
                            className="copy-btn"
                            onClick={() => copyToClipboard(settlement.utr)}
                            title="Copy UTR"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="pending-utr">Pending</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="date">
                      {formatDate(settlement.created_at)}
                    </span>
                  </td>
                  <td>
                    <span className="date">
                      {formatDate(settlement.processed_at)}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button 
                        className="action-btn view-btn"
                        title="View Details"
                        onClick={() => handleViewDetails(settlement)}
                      >
                        <Eye size={16} />
                      </button>
                      <div className="dropdown-container">
                        <button 
                          className="action-btn dropdown-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(settlement.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {dropdownOpen === settlement.id && (
                          <div className="dropdown-menu">
                            <button 
                              className="dropdown-item"
                              onClick={() => copyToClipboard(settlement.id)}
                            >
                              <Copy size={14} />
                              Copy Settlement ID
                            </button>
                            {settlement.utr && (
                              <button 
                                className="dropdown-item"
                                onClick={() => copyToClipboard(settlement.utr)}
                              >
                                <Copy size={14} />
                                Copy UTR
                              </button>
                            )}
                            <button 
                              className="dropdown-item"
                              onClick={() => handleDownloadReport(settlement)}
                            >
                              <Download size={14} />
                              Download Report
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
              );
            })}
          </tbody>
        </table>
      </div>

      {settlementsData.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">
            <Calendar size={48} />
          </div>
          <h3>No settlements found</h3>
          <p>No settlement transactions match your current filters.</p>
        </div>
      )}

      {settlementsData.length > 0 && (
        <div className="table-pagination">
          <div className="pagination-info">
            Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to {Math.min(pagination.currentPage * pagination.pageSize, settlements?.count || 0)} of {settlements?.count || 0}
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

export default SettlementsTable;