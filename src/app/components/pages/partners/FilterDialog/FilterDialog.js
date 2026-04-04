import React, { useState, useEffect } from 'react';
import { X, Calendar, Filter } from 'lucide-react';
import './FilterDialog.scss';

const FilterDialog = ({ isOpen, onClose, onApply, loading = false }) => {
  const [filters, setFilters] = useState({
    dateRange: '',
    status: 'all',
    startDate: '',
    endDate: ''
  });

  // Quick filter options based on the Redux slice preset options
  const quickFilters = [
    { label: '7 Days', value: '7days' },
    { label: '15 Days', value: '15days' },
    { label: 'This Month', value: 'thismonth' },
    { label: '3 Months', value: '3months' },
    { label: '6 Months', value: '6months' },
    { label: 'This Year', value: 'thisyear' }
  ];

  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Pending', value: 'pending' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' }
  ];

  const handleQuickFilterClick = (value) => {
    setFilters(prev => ({
      ...prev,
      dateRange: prev.dateRange === value ? '' : value,
      // Clear custom date range when selecting preset
      startDate: '',
      endDate: ''
    }));
  };

  const handleInputChange = (field, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value };
      
      // Clear date range preset when setting custom dates
      if (field === 'startDate' || field === 'endDate') {
        newFilters.dateRange = '';
      }
      
      return newFilters;
    });
  };

  const handleApply = () => {
    if (loading) return;
    onApply(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      dateRange: '',
      status: 'all',
      startDate: '',
      endDate: ''
    };
    setFilters(resetFilters);
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  // Check if any filters are applied
  const hasActiveFilters = filters.dateRange || 
                          filters.status !== 'all' || 
                          filters.startDate || 
                          filters.endDate;

  if (!isOpen) return null;

  return (
    <div className="filter-dialog-overlay">
      <div className="filter-dialog">
        <div className="filter-dialog-header">
          <div className="header-left">
            <Filter size={20} />
            <h3>QUICK FILTERS</h3>
          </div>
          <button 
            className="close-button" 
            onClick={handleClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="filter-dialog-content">
          <div className="quick-filters-section">
            <h4>Date Range Presets</h4>
            <div className="quick-filters-grid">
              {quickFilters.map((filter) => (
                <button
                  key={filter.value}
                  className={`quick-filter-btn ${filters.dateRange === filter.value ? 'active' : ''}`}
                  onClick={() => handleQuickFilterClick(filter.value)}
                  disabled={loading}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h4>Status Filter</h4>
            <select
              value={filters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="filter-select"
              disabled={loading}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h4>Custom Date Range</h4>
            
            <div className="date-range-inputs">
              <div className="date-input-group">
                <label>Start Date</label>
                <div className="date-input-container">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="date-input"
                    disabled={loading || !!filters.dateRange}
                  />
                  <Calendar size={16} className="date-icon" />
                </div>
              </div>
              
              <div className="date-input-group">
                <label>End Date</label>
                <div className="date-input-container">
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="date-input"
                    disabled={loading || !!filters.dateRange}
                    min={filters.startDate} // Ensure end date is not before start date
                  />
                  <Calendar size={16} className="date-icon" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="filter-dialog-footer">
          <button 
            className="reset-button" 
            onClick={handleReset}
            disabled={loading || !hasActiveFilters}
          >
            <X size={16} />
            Reset Filters
          </button>
          <button 
            className={`apply-button ${loading ? 'loading' : ''}`}
            onClick={handleApply}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Applying...
              </>
            ) : (
              <>
                <Filter size={16} />
                Apply Filter {hasActiveFilters && '✓'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterDialog;