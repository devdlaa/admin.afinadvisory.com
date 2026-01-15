"use client";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  CreditCard,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
} from "lucide-react";
import "./payments.scss";






import PaymentsTable from "@/app/components/pages/PaymentsTable/PaymentsTable";
import RefundsTable from "@/app/components/pages/RefundsTable/RefundsTable";
import SettlementsTable from "@/app/components/pages/SettlementsTable/SettlementsTable";
import RefundModal from "@/app/components/pages/RefundModal/RefundModal";

import BalanceSummary from "@/app/components/pages/BalanceSummary/BalanceSummary";
import FilterPanel from "@/app/components/pages/FilterPanel/FilterPanel";



// Import Redux actions
import {
  fetchBalanceSummary,
  fetchDowntimeStatus,
  fetchPayments,
  fetchRefunds,
  fetchSettlements,
  clearError,
  setSelectedPayment,
} from "@/store/slices/paymentSlice";

const PaymentsPage = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("payments");
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Redux state
  const {
    payments,
    refunds,
    settlements,

    loading,

    error,
    selectedPayment,
    pagination,
  } = useSelector((state) => state.payments);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setRefreshing(true);
    try {
      // Load balance and downtime data
      await dispatch(fetchBalanceSummary()).unwrap();
      await dispatch(fetchDowntimeStatus()).unwrap();

      // Load initial data based on active tab
      switch (activeTab) {
        case "payments":
          await dispatch(fetchPayments({ count: 10, skip: 0 })).unwrap();
          break;
        case "refunds":
          await dispatch(fetchRefunds({ count: 10, skip: 0 })).unwrap();
          break;
        case "settlements":
          await dispatch(fetchSettlements({ count: 10, skip: 0 })).unwrap();
          break;
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh all data
      await Promise.all([
        dispatch(fetchBalanceSummary()),
        dispatch(fetchDowntimeStatus()),
      ]);

      // Refresh current tab data
      const currentPage = pagination[activeTab]?.currentPage || 1;
      const pageSize = pagination[activeTab]?.pageSize || 10;
      const skip = (currentPage - 1) * pageSize;

      switch (activeTab) {
        case "payments":
          dispatch(fetchPayments({ count: pageSize, skip }));
          break;
        case "refunds":
          dispatch(fetchRefunds({ count: pageSize, skip }));
          break;
        case "settlements":
          dispatch(fetchSettlements({ count: pageSize, skip }));
          break;
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);

    // Load data for the selected tab if not already loaded
    const tabData = {
      payments: payments?.items?.length,
      refunds: refunds?.items?.length,
      settlements: settlements?.items?.length,
    };

    if (!tabData[tab]) {
      try {
        switch (tab) {
          case "payments":
            dispatch(fetchPayments({ count: 10, skip: 0 }));
            break;
          case "refunds":
            dispatch(fetchRefunds({ count: 10, skip: 0 }));
            break;
          case "settlements":
            dispatch(fetchSettlements({ count: 10, skip: 0 }));
            break;
        }
      } catch (error) {
        console.error(`Error loading ${tab} data:`, error);
      }
    }
  };

  const handleCreateRefund = (payment) => {
    dispatch(setSelectedPayment(payment));
    setShowRefundModal(true);
  };

  const handleCloseRefundModal = () => {
    setShowRefundModal(false);
    dispatch(setSelectedPayment(null));
  };

  const tabs = [
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "refunds", label: "Refunds", icon: RefreshCw },
    { id: "settlements", label: "Settlements", icon: TrendingUp },
  ];

  return (
    <div className="payments-page">
      {/* Header */}
      <div className="payments-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="page-title">
              <CreditCard className="title-icon" />
              Payment Management
            </h1>
            <p className="page-subtitle">
              Monitor and manage all payment transactions
            </p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Balance Summary */}
      <BalanceSummary />

      {/* Downtime Status */}
      {/* <DowntimeStatus /> */}

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          onClose={() => setShowFilters(false)}
          activeTab={activeTab}
        />
      )}

      {/* Main Content */}
      <div className="payments-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <div className="tab-list">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={`tab-item ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "payments" && (
            <PaymentsTable onCreateRefund={handleCreateRefund} />
          )}
          {activeTab === "refunds" && <RefundsTable />}
          {activeTab === "settlements" && <SettlementsTable />}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <RefundModal
          payment={selectedPayment}
          onClose={handleCloseRefundModal}
        />
      )}

      {/* Loading Overlay */}
      {(loading || refreshing) && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <RefreshCw size={24} className="spinning" />
            <span>Loading...</span>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="error-toast">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())}>×</button>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
