import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { filterCommissions, clearFilters } from '@/store/slices/commissionsSlice';
import { Filter, X, Calendar, Search, RefreshCw } from 'lucide-react';
import './CommissionFilters.scss';

const CommissionFilters = ({ onClose }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.commissions);
  
  const [filters, setFilters] = useState({
    quickRange: '',
    startDate: '',
    endDate: '',
    extraFilter: {
      field: '',
      value: ''
    }
  });

  const quickRangeOptions = [
    { value: 'last7days', label: 'Last 7 days' },
    { value: 'last15days', label: 'Last 15 days' },
    { value: 'thisMonth', label: 'This month' },
    { value: 'last3months', label: 'Last 3 months' },
    { value: 'last6months', label: 'Last 6 months' },
    { value: 'thisYear', label: 'This year' },
  ];

  const filterFieldOptions = [
    { value: 'couponCode', label: 'Coupon Code' },
    { value: 'customerId', label: 'Customer ID' },
    { value: 'influencerId', label: 'Influencer ID' },
    { value: 'service_booking_id', label: 'Service Booking ID' },
  ];

  const handleInputChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExtraFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      extraFilter: {
        ...prev.extraFilter,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const filterData = {};
    
    // Date range filters
    if (filters.quickRange) {
      filterData.quickRange = filters.quickRange;
    } else if (filters.startDate && filters.endDate) {
      filterData.startDate = filters.startDate;
      filterData.endDate = filters.endDate;
    }
    
    // Extra field filter
    if (filters.extraFilter.field && filters.extraFilter.value) {
      filterData.extraFilter = filters.extraFilter;
    }
    
    dispatch(filterCommissions(filterData));
    onClose?.();
  };

  const handleClear = () => {
    setFilters({
      quickRange: '',
      startDate: '',
      endDate: '',
      extraFilter: {
        field: '',
        value: ''
      }
    });
    dispatch(clearFilters());
    onClose?.();
  };

  const isDateRangeSelected = filters.startDate && filters.endDate;
  const isQuickRangeSelected = !!filters.quickRange;
  const hasAnyFilter = isDateRangeSelected || isQuickRangeSelected || 
    (filters.extraFilter.field && filters.extraFilter.value);

  return (
    <div className="commission-filters">
      <div className="filter-header">
        <div className="filter-title">
          <Filter size={18} />
          <span>Filter Commissions</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="filter-form">
        {/* Date Range Section */}
        <div className="filter-section">
          <h4 className="section-title">
            <Calendar size={16} />
            Date Range
          </h4>
          
          <div className="date-filters">
            <div className="quick-range">
              <label>Quick Range</label>
              <select
                value={filters.quickRange}
                onChange={(e) => {
                  handleInputChange('quickRange', e.target.value);
                  // Clear custom dates when quick range is selected
                  if (e.target.value) {
                    handleInputChange('startDate', '');
                    handleInputChange('endDate', '');
                  }
                }}
              >
                <option value="">Select quick range</option>
                {quickRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="custom-range">
              <div className="date-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      handleInputChange('startDate', e.target.value);
                      // Clear quick range when custom dates are selected
                      if (e.target.value && filters.endDate) {
                        handleInputChange('quickRange', '');
                      }
                    }}
                    max={filters.endDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      handleInputChange('endDate', e.target.value);
                      // Clear quick range when custom dates are selected
                      if (e.target.value && filters.startDate) {
                        handleInputChange('quickRange', '');
                      }
                    }}
                    min={filters.startDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          </div>

          {(isDateRangeSelected || isQuickRangeSelected) && (
            <div className="filter-preview">
              <span className="preview-label">Date Filter:</span>
              <span className="preview-value">
                {isQuickRangeSelected 
                  ? quickRangeOptions.find(opt => opt.value === filters.quickRange)?.label
                  : `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
                }
              </span>
            </div>
          )}
        </div>

        {/* Field Filter Section */}
        <div className="filter-section">
          <h4 className="section-title">
            <Search size={16} />
            Field Filter
          </h4>
          
          <div className="field-filters">
            <div className="form-group">
              <label>Filter By</label>
              <select
                value={filters.extraFilter.field}
                onChange={(e) => handleExtraFilterChange('field', e.target.value)}
              >
                <option value="">Select field to filter</option>
                {filterFieldOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {filters.extraFilter.field && (
              <div className="form-group">
                <label>Filter Value</label>
                <input
                  type="text"
                  placeholder={`Enter ${filterFieldOptions.find(opt => opt.value === filters.extraFilter.field)?.label.toLowerCase()}`}
                  value={filters.extraFilter.value}
                  onChange={(e) => handleExtraFilterChange('value', e.target.value)}
                />
              </div>
            )}
          </div>

          {filters.extraFilter.field && filters.extraFilter.value && (
            <div className="filter-preview">
              <span className="preview-label">Field Filter:</span>
              <span className="preview-value">
                {filterFieldOptions.find(opt => opt.value === filters.extraFilter.field)?.label}: {filters.extraFilter.value}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
            disabled={loading}
          >
            <X size={14} />
            Clear All
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !hasAnyFilter}
          >
            {loading ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <Filter size={14} />
            )}
            Apply Filters
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommissionFilters;