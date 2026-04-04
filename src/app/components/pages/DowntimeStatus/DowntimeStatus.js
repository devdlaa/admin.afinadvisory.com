import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import './DowntimeStatus.scss';

import { 
  fetchDowntimeStatus,
  selectDowntime,
  selectIsLoadingDowntime,
  selectDowntimeError
} from '@/store/slices/paymentSlice';

const DowntimeStatus = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const downtime = useSelector(selectDowntime);
  const loading = useSelector(selectIsLoadingDowntime);
  const error = useSelector(selectDowntimeError);



  const loadDowntimeStatus = async () => {
    try {
      await dispatch(fetchDowntimeStatus()).unwrap();
    } catch (error) {
      console.error('Error loading downtime status:', error);
    }
  };

  const getMethodIcon = (method) => {
    const icons = {
      card: '💳',
      upi: '📱',
      netbanking: '🏦',
      wallet: '👛',
      emi: '📊'
    };
    return icons[method] || '💰';
  };

  const getMethodName = (method) => {
    const names = {
      card: 'Card Payments',
      upi: 'UPI Payments',
      netbanking: 'Net Banking',
      wallet: 'Wallet Payments',
      emi: 'EMI Payments'
    };
    return names[method] || method.toUpperCase();
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: 'danger',
      medium: 'warning',
      low: 'info'
    };
    return colors[severity] || 'info';
  };

  const getStatusIcon = (status) => {
    return status === 'started' ? <WifiOff size={16} /> : <CheckCircle size={16} />;
  };

  if (loading) {
    return (
      <div className="downtime-status loading">
        <div className="skeleton-header"></div>
        <div className="skeleton-content">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-item"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="downtime-status error">
        <div className="error-content">
          <AlertTriangle size={20} />
          <span>Failed to load payment status</span>
          <button 
            className="retry-btn"
            onClick={loadDowntimeStatus}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Use actual downtime data from Redux or fallback to empty array
  const downtimeData = downtime || [];
  
  const hasActiveIssues = downtimeData.some(method => 
    method.issues && method.issues.some(issue => issue.status === 'started')
  );

  return (
    <div className={`downtime-status ${hasActiveIssues ? 'has-issues' : 'all-clear'}`}>
      <div className="status-header">
        <div className="header-left">
          <div className="status-icon">
            {hasActiveIssues ? (
              <AlertTriangle size={20} />
            ) : (
              <CheckCircle size={20} />
            )}
          </div>
          <div className="header-text">
            <h3>Payment Gateway Status</h3>
            <p>
              {hasActiveIssues 
                ? 'Some payment methods are experiencing issues' 
                : 'All payment methods are operational'
              }
            </p>
          </div>
        </div>
        <button 
          className="refresh-btn"
          onClick={loadDowntimeStatus}
          title="Refresh status"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="status-content">
        {downtimeData.length > 0 ? (
          downtimeData.map(methodData => {
            const activeIssues = (methodData.issues || []).filter(issue => issue.status === 'started');
            const recentIssues = (methodData.issues || []).filter(issue => issue.status === 'ended').slice(0, 1);
            const allIssues = [...activeIssues, ...recentIssues];

            return (
              <div 
                key={methodData.method} 
                className={`method-status ${activeIssues.length > 0 ? 'has-issues' : 'operational'}`}
              >
                <div className="method-header">
                  <div className="method-info">
                    <span className="method-icon">{getMethodIcon(methodData.method)}</span>
                    <span className="method-name">{getMethodName(methodData.method)}</span>
                  </div>
                  <div className="method-status-indicator">
                    {activeIssues.length > 0 ? (
                      <span className="status-badge warning">
                        <WifiOff size={12} />
                        Issues
                      </span>
                    ) : (
                      <span className="status-badge success">
                        <Wifi size={12} />
                        Operational
                      </span>
                    )}
                  </div>
                </div>

                {allIssues.length > 0 && (
                  <div className="issues-list">
                    {allIssues.map((issue, index) => (
                      <div 
                        key={index} 
                        className={`issue-item ${getSeverityColor(issue.severity)} ${issue.status}`}
                      >
                        <div className="issue-header">
                          <div className="issue-status">
                            {getStatusIcon(issue.status)}
                            <span className="status-text">
                              {issue.status === 'started' ? 'Ongoing' : 'Resolved'}
                            </span>
                          </div>
                          <div className="issue-severity">
                            <span className={`severity-badge ${getSeverityColor(issue.severity)}`}>
                              {issue.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="issue-details">
                          {issue.instrument && (
                            <div className="detail-row">
                              <span className="label">Affected:</span>
                              <span className="value">{issue.instrument}</span>
                            </div>
                          )}
                          <div className="detail-row">
                            <span className="label">Started:</span>
                            <span className="value">{issue.begin}</span>
                          </div>
                          {issue.end && (
                            <div className="detail-row">
                              <span className="label">Resolved:</span>
                              <span className="value">{issue.end}</span>
                            </div>
                          )}
                          {issue.scheduled && (
                            <div className="detail-row">
                              <Clock size={12} />
                              <span className="scheduled-label">Scheduled Maintenance</span>
                            </div>
                          )}
                        </div>

                        {issue.message && (
                          <div className="issue-message">
                            {issue.message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="no-data">
            <span>No payment method data available</span>
          </div>
        )}
      </div>

      {!hasActiveIssues && downtimeData.length > 0 && (
        <div className="all-clear-message">
          <CheckCircle size={16} />
          <span>All payment methods are working normally</span>
        </div>
      )}
    </div>
  );
};

export default DowntimeStatus;