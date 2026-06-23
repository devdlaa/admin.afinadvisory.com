import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import "./BalanceSummary.scss";

import {
  fetchBalanceSummary,
  selectBalance,
  selectIsLoadingBalance,
  selectBalanceError,
} from "@/store/slices/paymentSlice";

const BalanceSummary = () => {
  const dispatch = useDispatch();

  // Redux state
  const balance = useSelector(selectBalance);
  const loading = useSelector(selectIsLoadingBalance);
  const error = useSelector(selectBalanceError);

  useEffect(() => {
    loadBalanceSummary();
  }, [dispatch]);

  const loadBalanceSummary = async () => {
    try {
      await dispatch(fetchBalanceSummary()).unwrap();
    } catch (error) {
      console.error("Error loading balance summary:", error);
    }
  };

  const getSummaryCards = () => {
    // Use actual balance data from Redux or show default structure
    const balanceData = balance || {
      totalDueInBank: "₹0",
      lastProcessedAmount: "₹0",
      upcomingSettlementAmount: "₹0",
      upcomingSettlementDate: null,
    };

    return [
      {
        title: "Total Due in Bank",
        value: balanceData.totalDueInBank,
        description: "Amount pending settlement from Razorpay",
        icon: DollarSign,
        variant: "primary",
      },
      {
        title: "Last Processed Settlement",
        value: balanceData.lastProcessedAmount,
        description: "Most recent completed settlement",
        icon: TrendingUp,
        variant: "success",
      },
      {
        title: "Upcoming Settlement",
        value: balanceData.upcomingSettlementAmount,
        description: balanceData.upcomingSettlementDate
          ? `Next settlement on : Not Available`
          : "No upcoming settlement scheduled",
        icon: Calendar,
        variant: "warning",
      },
    ];
  };

  if (loading) {
    return (
      <div className="balance-summary loading">
        <div className="summary-header">
          <h2>Balance Overview</h2>
          <p>Current settlement status and pending amounts</p>
        </div>
        <div className="loading-cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton">
              <div className="skeleton-icon"></div>
              <div className="skeleton-content">
                <div className="skeleton-line large"></div>
                <div className="skeleton-line medium"></div>
                <div className="skeleton-line small"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="balance-summary error">
        <div className="summary-header">
          <h2>Balance Overview</h2>
          <p>Current settlement status and pending amounts</p>
        </div>
        <div className="error-content">
          <div className="error-card">
            <AlertCircle size={24} />
            <div className="error-text">
              <h3>Failed to load balance data</h3>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summaryCards = getSummaryCards();

  return (
    <div className="balance-summary">
      <div className="summary-header">
        <div className="header-content">
          <h2>Balance Overview</h2>
          <p>Current settlement status and pending amounts</p>
        </div>
      </div>

      <div className="summary-cards">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`summary-card ${card.variant}`}>
              <div className="card-icon">
                <Icon size={24} />
              </div>
              <div className="card-content">
                <div className="card-value">{card.value}</div>
                <div className="card-title">{card.title}</div>
                <div className="card-description">{card.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BalanceSummary;
