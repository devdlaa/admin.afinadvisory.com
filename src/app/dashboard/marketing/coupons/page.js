"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  Plus,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

import {
  fetchCoupons,
  searchCoupons,
  searchCouponsByDateRange,
  clearSearchResults,
  clearError,
  setCurrentPage,
} from "@/store/slices/couponsSlice";
import CouponCard from "../../../components/CouponCard/CouponCard.js";
import CreateCouponModal from "../../../components/CreateCouponModal/CreateCouponModal.js";
import SearchFilters from "../../../components/SearchFilters/SearchFilters.js";

import "./coupons.scss";
import { CircularProgress } from "@mui/material";

export default function CouponsPage() {
  const dispatch = useDispatch();
  const {
    coupons,
    searchResults,
    pagination,
    loading,
    searchLoading,
    error,
    isSearchMode,
    hasFeched,
  } = useSelector((state) => state.coupons);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("code");

  // Load initial coupons
  useEffect(() => {
    if (!loading && hasFeched === false) {
      dispatch(fetchCoupons({ page: 1, limit: 10 }));
    }
  }, [dispatch]);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    dispatch(
      searchCoupons({
        searchTerm: searchQuery.trim(),
        searchType,
      })
    );
  };

  // Handle date range search
  const handleDateRangeSearch = (startDate, endDate) => {
    dispatch(searchCouponsByDateRange({ startDate, endDate }));
  };

  // Clear search and reload
  const handleClearSearch = () => {
    setSearchQuery("");
    dispatch(clearSearchResults());
    dispatch(fetchCoupons({ page: 1, limit: 10 }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    dispatch(setCurrentPage(newPage));
    if (!isSearchMode) {
      dispatch(fetchCoupons({ page: newPage, limit: 10 }));
    }
  };

  // Get display data based on search mode
  const displayCoupons = isSearchMode ? searchResults : coupons;
  const displayLoading = isSearchMode ? searchLoading : loading;


  return (
    <div className="coupons-page">
      <div className="container">
        {/* Header Section */}
        <div className="coupons-header">
          <div className="header-content">
            <div className="title-section">
              <h1>Coupon Management</h1>
              <p>
                Manage and monitor all your discount coupons with comprehensive
                analytics
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-wrapper">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder={`Search by ${
                    searchType === "code"
                      ? "coupon code"
                      : searchType === "influencer_email"
                      ? "influencer email"
                      : "influencer phone"
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="search-type-select"
                >
                  <option value="code">Coupon Code</option>
                </select>
              </div>

              <button
                type="submit"
                className="filter-btn "
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <>
                    <CircularProgress color="grey" size={18} />
                    <p>Searching...</p>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <p>Search</p>
                  </>
                )}
              </button>
            </form>

            <div className="filter-actions">
              <button
                className={`filter-btn ${showSearchFilters ? "active" : ""}`}
                onClick={() => setShowSearchFilters(!showSearchFilters)}
              >
                <Filter size={18} />
                Advanced Filters
              </button>

              {isSearchMode && (
                <button
                  className="clear-search-btn"
                  onClick={handleClearSearch}
                >
                  Clear Search
                </button>
              )}
              <button
                className="create-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={18} />
                Create Coupon
              </button>
            </div>
          </div>

          {/* Search Filters */}
          {showSearchFilters && (
            <div className="filters-wrapper">
              <SearchFilters onDateRangeSearch={handleDateRangeSearch} />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>ERROR</span>
            <button onClick={() => dispatch(clearError())}>×</button>
          </div>
        )}

        {/* Content Section */}
        <div className="coupons-content">
          {displayLoading ? (
            <div className="loading-state">
              <Loader2 size={40} className="spinner" />
              <p>Loading coupons...</p>
            </div>
          ) : displayCoupons.length === 0 ? (
            <div className="empty-state">
              <div className="empty-content">
                <Search size={64} />
                <h3>No coupons found</h3>
                <p>
                  {isSearchMode
                    ? "We couldn't find any coupons matching your search criteria. Try adjusting your filters or search terms."
                    : "You haven't created any coupons yet. Create your first coupon."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Results Information */}
              <div className="results-info">
                <span>
                  {isSearchMode
                    ? `Found ${searchResults.length} result${
                        searchResults.length !== 1 ? "s" : ""
                      }`
                    : `Showing ${displayCoupons.length} of ${
                        pagination.total
                      } coupon${pagination.total !== 1 ? "s" : ""}`}
                </span>
              </div>

              {/* Coupons Grid */}
              <div className="coupons-grid">
                {displayCoupons.map((coupon) => (
                  <CouponCard key={coupon._id} coupon={coupon} />
                ))}
              </div>

              {/* Pagination */}
              {!isSearchMode && pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>

                  <div className="pagination-info">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>

                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={
                      pagination.page >= pagination.totalPages || loading
                    }
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <CreateCouponModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    </div>
  );
}
