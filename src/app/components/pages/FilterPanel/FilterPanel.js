import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  X, 
  Calendar,
  Filter,
  RotateCcw
} from 'lucide-react';
import './FilterPanel.scss';

import {
  fetchPaymentsWithDateFilter,
  fetchRefundsWithDateFilter,
  fetchSettlementsWithDateFilter,
  setPaymentFilters,
  setRefundFilters,
  setSettlementFilters,
  resetPaymentFilters,
  resetRefundFilters,
  resetSettlementFilters,
  selectPaymentFilters,
  selectRefundFilters,
  selectSettlementFilters
} from '@/store/slices/paymentSlice';

const FilterPanel = ({ onClose, activeTab }) => {
  const dispatch = useDispatch();
  
  // Redux state for current filters
  const paymentFilters = useSelector(selectPaymentFilters);
  const refundFilters = useSelector(selectRefundFilters);
  const settlementFilters = useSelector(selectSettlementFilters);
  
  // Get current filters based on active tab
  const getCurrentFilters = () => {
    switch (activeTab) {
      case 'payments':
        return paymentFilters;
      case 'refunds':
        return refundFilters;
      case 'settlements':
        return settlementFilters;
      default:
        return paymentFilters;
    }
  };

  const [localFilters, setLocalFilters] = useState(() => {
    const currentFilters = getCurrentFilters();
    return {
      dateRange: {
        from: currentFilters.dateRange.from ? new Date(currentFilters.dateRange.from * 1000).toISOString().split('T')[0] : '',
        to: currentFilters.dateRange.to ? new Date(currentFilters.dateRange.to * 1000).toISOString().split('T')[0] : ''
      }
    };
  });

  // Update local filters when active tab changes
  useEffect(() => {
    const currentFilters = getCurrentFilters();
    setLocalFilters({
      dateRange: {
        from: currentFilters.dateRange.from ? new Date(currentFilters.dateRange.from * 1000).toISOString().split('T')[0] : '',
        to: currentFilters.dateRange.to ? new Date(currentFilters.dateRange.to * 1000).toISOString().split('T')[0] : ''
      }
    });
  }, [activeTab, paymentFilters, refundFilters, settlementFilters]);

  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: {
        ...prev[filterType],
        ...value
      }
    }));
  };

  const handleApplyFilters = async () => {
    // Convert date strings to timestamps
    const filterData = {
      dateRange: {
        from: localFilters.dateRange.from ? Math.floor(new Date(localFilters.dateRange.from).getTime() / 1000) : null,
        to: localFilters.dateRange.to ? Math.floor(new Date(localFilters.dateRange.to).getTime() / 1000) : null
      }
    };

    try {
      // Update filters in Redux store
      switch (activeTab) {
        case 'payments':
          dispatch(setPaymentFilters(filterData));
          // Fetch filtered data
          if (filterData.dateRange.from || filterData.dateRange.to) {
            await dispatch(fetchPaymentsWithDateFilter({
              count: 10,
              skip: 0,
              from: filterData.dateRange.from,
              to: filterData.dateRange.to
            })).unwrap();
          }
          break;
        case 'refunds':
          dispatch(setRefundFilters(filterData));
          if (filterData.dateRange.from || filterData.dateRange.to) {
            await dispatch(fetchRefundsWithDateFilter({
              count: 10,
              skip: 0,
              from: filterData.dateRange.from,
              to: filterData.dateRange.to
            })).unwrap();
          }
          break;
        case 'settlements':
          dispatch(setSettlementFilters(filterData));
          if (filterData.dateRange.from || filterData.dateRange.to) {
            await dispatch(fetchSettlementsWithDateFilter({
              count: 10,
              skip: 0,
              from: filterData.dateRange.from,
              to: filterData.dateRange.to
            })).unwrap();
          }
          break;
        default:
          break;
      }
      
      onClose();
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      dateRange: {
        from: '',
        to: ''
      }
    };
    
    setLocalFilters(emptyFilters);
    
    // Reset in Redux store
    switch (activeTab) {
      case 'payments':
        dispatch(resetPaymentFilters());
        break;
      case 'refunds':
        dispatch(resetRefundFilters());
        break;
      case 'settlements':
        dispatch(resetSettlementFilters());
        break;
      default:
        break;
    }
  };

  const getPresetDateRanges = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const last3Months = new Date(today);
    last3Months.setMonth(last3Months.getMonth() - 3);

    return [
      {
        label: 'Today',
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      },
      {
        label: 'Yesterday',
        from: yesterday.toISOString().split('T')[0],
        to: yesterday.toISOString().split('T')[0]
      },
      {
        label: 'Last 7 days',
        from: lastWeek.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      },
      {
        label: 'Last 30 days',
        from: lastMonth.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      },
      {
        label: 'Last 3 months',
        from: last3Months.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
      }
    ];
  };

  const applyPresetDateRange = (preset) => {
    handleFilterChange('dateRange', {
      from: preset.from,
      to: preset.to
    });
  };

  return (
    <div className="filter-panel-overlay" onClick={onClose}>
      <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="header-left">
            <Filter size={20} />
            <h3>Filter {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} by Date</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="panel-body">
          {/* Date Range */}
          <div className="filter-section">
            <h4>
              <Calendar size={16} />
              Date Range
            </h4>
            
            {/* Preset ranges */}
            <div className="preset-ranges">
              {getPresetDateRanges().map((preset, index) => (
                <button
                  key={index}
                  className="preset-btn"
                  onClick={() => applyPresetDateRange(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            <div className="date-inputs">
              <div className="date-input-group">
                <label>From Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.from}
                  onChange={(e) => handleFilterChange('dateRange', { from: e.target.value })}
                  className="filter-input date-input"
                />
              </div>
              <div className="date-input-group">
                <label>To Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.to}
                  onChange={(e) => handleFilterChange('dateRange', { to: e.target.value })}
                  className="filter-input date-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel-footer">
          <button 
            className="btn btn-secondary"
            onClick={handleResetFilters}
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <div className="footer-actions">
            <button 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleApplyFilters}
            >
              Apply Date Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;