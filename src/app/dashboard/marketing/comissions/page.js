"use client";
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCommissions,
  searchCommissions,
  filterCommissions,
  updateCommissionStatus,
  setStatusFilter,
  toggleCommissionSelection,
  toggleSelectAll,
  clearSelections,
  clearSearch,
  clearFilters,
  clearError,
  resetPagination,
  resetCommissionsState,
} from "@/store/slices/commissionsSlice";

import { exportCommissionsToExcel } from "@/utils/utils";
import {
  Search,
  Filter,
  Download,
  CheckSquare,
  Square,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  MoreHorizontal,
  RefreshCw,
  X,
  Check,
  Clock,
  IndianRupee,
} from "lucide-react";
import "./comissions.scss";

const CommissionsManagement = () => {
  const dispatch = useDispatch();
  const {
    commissions,
    selectedCommissions,
    selectAll,
    filters,
    pagination,
    loading,
    searchLoading,
    updateLoading,
    error,
    isSearchMode,
    isFilterMode,
    stats,
    hasFetched,
    isFetching,
  } = useSelector((state) => state.commissions);

  // Local state
  const [searchValue, setSearchValue] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterForm, setFilterForm] = useState({
    quickRange: "",
    startDate: "",
    endDate: "",
    extraFilter: { field: "", value: "" },
  });

  // Use ref to track if we've already initialized
  const hasInitializedRef = useRef(false);

  // Initialize data - only fetch once when component first mounts
  useEffect(() => {
    if (!hasInitializedRef.current && !hasFetched && !isFetching) {
      hasInitializedRef.current = true;
      dispatch(fetchCommissions({ limit: 20, fresh: true }));
    }
  }, [dispatch, hasFetched, isFetching]);

  // Clear error on mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Handlers
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      dispatch(clearSearch());
      return;
    }
    dispatch(searchCommissions({ value: searchValue.trim() }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const { quickRange, startDate, endDate, extraFilter } = filterForm;

    // Enforce rules:
    const usingQuickRange = Boolean(quickRange);
    const usingDateRange = Boolean(startDate && endDate);

    if (
      (usingQuickRange && usingDateRange) ||
      (!usingQuickRange && !usingDateRange)
    ) {
      alert(
        "Please select either a quick range OR a start & end date (not both)."
      );
      return;
    }

    // Build filter object
    const filterData = {};

    if (usingQuickRange) {
      filterData.quickRange = quickRange;
    } else if (usingDateRange) {
      filterData.startDate = startDate;
      filterData.endDate = endDate;
    }

    if (extraFilter.field && extraFilter.value) {
      filterData.extraFilter = extraFilter;
    }

    dispatch(filterCommissions(filterData));
  };

  const handleClearFilters = () => {
    setFilterForm({
      quickRange: "",
      startDate: "",
      endDate: "",
      extraFilter: { field: "", value: "" },
    });
    dispatch(clearFilters());
    setShowFilters(false);
  };

  const handleStatusUpdate = (actionType) => {
    if (selectedCommissions.length === 0) return;
    dispatch(updateCommissionStatus({ actionType, ids: selectedCommissions }));
  };

  const handleLoadMore = () => {
    if (!pagination.hasMore || loading || isFetching) return;
    dispatch(
      fetchCommissions({
        limit: 20,
        cursor: pagination.cursor,
      })
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return (
          <span className="status-badge status-paid">
            <Check size={14} /> Paid
          </span>
        );
      case "unpaid":
        return (
          <span className="status-badge status-unpaid">
            <Clock size={14} /> Unpaid
          </span>
        );
      default:
        return (
          <span className="status-badge status-pending">
            <Clock size={14} /> Pending
          </span>
        );
    }
  };

  return (
    <div className="commissions-management">
      <div className="commision_top_wrapper">
        {/* Header */}
        <div className="header">
          <div className="header-content">
            <h1 className="title">Commission Reports</h1>
            <p className="subtitle">
              Manage influencer commissions and payments
            </p>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <IndianRupee size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {formatCurrency(stats.totalAmount)}
                </span>
                <span className="stat-label">Total Amount</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon success">
                <TrendingUp size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {formatCurrency(stats.paidAmount)}
                </span>
                <span className="stat-label">Paid Amount</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon warning">
                <Clock size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">
                  {formatCurrency(stats.unpaidAmount)}
                </span>
                <span className="stat-label">Unpaid Amount</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Users size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Records</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls">
          {/* Search */}
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by coupon code, customer ID, influencer ID, or booking ID..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
              {searchValue && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => {
                    setSearchValue("");
                    dispatch(clearSearch());
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={searchLoading}
            >
              {searchLoading ? (
                <RefreshCw size={14} className="spin" />
              ) : (
                <Search size={14} />
              )}
              Search
            </button>
          </form>

          {/* Action Buttons */}
          <div className="actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} />
              Filters
            </button>

            {selectedCommissions.length > 0 && (
              <>
                <button
                  className="btn btn-success"
                  onClick={() => handleStatusUpdate("markPaid")}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <RefreshCw size={14} className="spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Mark Paid ({selectedCommissions.length})
                </button>

                <button
                  className="btn btn-warning"
                  onClick={() => handleStatusUpdate("markUnpaid")}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <RefreshCw size={14} className="spin" />
                  ) : (
                    <Clock size={14} />
                  )}
                  Mark Unpaid ({selectedCommissions.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-panel">
            <form onSubmit={handleFilterSubmit} className="filter-form">
              <div className="filter-row">
                <div className="form-group">
                  <label>Quick Range</label>
                  <select
                    value={filterForm.quickRange}
                    onChange={(e) =>
                      setFilterForm({
                        ...filterForm,
                        quickRange: e.target.value,
                        startDate: "",
                        endDate: "",
                      })
                    }
                  >
                    <option value="">Select range</option>
                    <option value="last7days">Last 7 days</option>
                    <option value="last15days">Last 15 days</option>
                    <option value="thisMonth">This month</option>
                    <option value="last3months">Last 3 months</option>
                    <option value="last6months">Last 6 months</option>
                    <option value="thisYear">This year</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={filterForm.startDate}
                    onChange={(e) =>
                      setFilterForm({
                        ...filterForm,
                        startDate: e.target.value,
                        quickRange: "",
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={filterForm.endDate}
                    onChange={(e) =>
                      setFilterForm({
                        ...filterForm,
                        endDate: e.target.value,
                        quickRange: "",
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Filter Field</label>
                  <select
                    value={filterForm.extraFilter.field}
                    onChange={(e) =>
                      setFilterForm({
                        ...filterForm,
                        extraFilter: {
                          ...filterForm.extraFilter,
                          field: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Select field</option>
                    <option value="couponCode">Coupon Code</option>
                    <option value="customerId">Customer ID</option>
                    <option value="influencerId">Influencer ID</option>
                    <option value="service_booking_id">
                      Service Booking ID
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Filter Value</label>
                  <input
                    type="text"
                    placeholder="Enter value"
                    value={filterForm.extraFilter.value}
                    onChange={(e) =>
                      setFilterForm({
                        ...filterForm,
                        extraFilter: {
                          ...filterForm.extraFilter,
                          value: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw size={14} className="spin" />
                  ) : (
                    <Filter size={14} />
                  )}
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearFilters}
                >
                  <X size={14} />
                  Clear
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status Filters */}
        <div className="status-tabs">
          <button
            className={`status-tab ${
              filters.statusFilter === "all" ? "active" : ""
            }`}
            onClick={() => dispatch(setStatusFilter("all"))}
          >
            All ({stats.total})
          </button>
          <button
            className={`status-tab ${
              filters.statusFilter === "paid" ? "active" : ""
            }`}
            onClick={() => dispatch(setStatusFilter("paid"))}
          >
            Paid ({stats.paid})
          </button>
          <button
            className={`status-tab ${
              filters.statusFilter === "unpaid" ? "active" : ""
            }`}
            onClick={() => dispatch(setStatusFilter("unpaid"))}
          >
            Unpaid ({stats.unpaid})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <X size={16} />
            {error}
            <button
              onClick={() => dispatch(clearError())}
              className="close-error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Active Filters Info */}
        {(isSearchMode || isFilterMode) && (
          <div className="active-filters">
            <span>Active filters applied</span>
            <button
              className="clear-all"
              onClick={() => {
                dispatch(clearSearch());
                dispatch(clearFilters());
                setSearchValue("");
              }}
            >
              <X size={14} />
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading && commissions.length === 0 ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spin" />
            <p>Loading commissions...</p>
          </div>
        ) : commissions.length === 0 ? (
          <div className="empty-state">
            <DollarSign size={48} />
            <h3>No commissions found</h3>
            <p>No commission records match your current filters.</p>
          </div>
        ) : (
          <>
            <table className="commissions-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="select-all-btn"
                      onClick={() => dispatch(toggleSelectAll())}
                    >
                      {selectAll ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th>Coupon Code</th>
                  <th>Commission ID</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Influencer</th>
                  <th>Created Date</th>
                  <th>Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <tr
                    key={commission.id}
                    className={
                      selectedCommissions.includes(commission.id)
                        ? "selected"
                        : ""
                    }
                  >
                    <td>
                      <button
                        className="select-btn"
                        onClick={() =>
                          dispatch(toggleCommissionSelection(commission.id))
                        }
                      >
                        {selectedCommissions.includes(commission.id) ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td>
                      <span className="coupon-code">
                        {commission.couponCode}
                      </span>
                    </td>
                    <td>
                      <span className="commission-id">{commission.id}</span>
                    </td>
                    <td>{getStatusBadge(commission.status)}</td>
                    <td>
                      <span className="amount">
                        {formatCurrency(commission.amount)}
                      </span>
                    </td>
                    <td>
                      <span className="influencer-id">
                        {commission.influencerId}
                      </span>
                    </td>
                    <td>{formatDate(commission.createdAt)}</td>
                    <td>
                      {commission.paidAt
                        ? formatDate(commission.paidAt)
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Load More */}
            {pagination.hasMore && (
              <div className="load-more">
                <button
                  className="btn btn-secondary"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? <RefreshCw size={14} className="spin" /> : null}
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CommissionsManagement;