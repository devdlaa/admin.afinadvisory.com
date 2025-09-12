"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Eye,
  Edit3,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Check,
  Shield,
  ShieldCheck,
} from "lucide-react";

import {
  selectCustomer,
  setCustomerDrawr,
} from "@/store/slices/customersSlice";
import "./CustomersTable.scss";
import { CircularProgress } from "@mui/material";

const statusConfig = {
  active: { label: "Active", icon: CheckCircle, color: "success" },
  inactive: { label: "Inactive", icon: XCircle, color: "error" },
  suspended: { label: "Suspended", icon: AlertCircle, color: "warning" },
};

const CustomersTable = ({ actionButtons = [] }) => {
  const dispatch = useDispatch();

  // Redux selectors
  const customers = useSelector((state) => state.customers.customers);
  const searchedCustomers = useSelector(
    (state) => state.customers.searchedCustomers
  );

  const { loading, searchLoading } = useSelector((state) => state.customers);
  const { isSearchActive, isFilterActive } = useSelector(
    (state) => state.customers
  );

  const defaultActions = [
    {
      text: "Edit User Profile",
      icon: Edit3,
      onClick: (customer) => {
        dispatch(selectCustomer(customer.id));
        dispatch(setCustomerDrawr());
      },
    },
  ];

  const actions = actionButtons.length > 0 ? actionButtons : defaultActions;

  // Handle individual checkbox selection
  const handleSelectCustomer = (customerId) => {
    dispatch(selectCustomer(customerId));
  };

  // Handle select all checkbox
  const handleSelectAll = () => {};

  const getStatusClass = (status) => {
    return `status-badge status-${statusConfig[status]?.color || "default"}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDisplayName = (customer) => {
    if (customer.firstName || customer.lastName) {
      return `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    }
    return customer.email?.split("@")[0] || "Unknown User";
  };

  let renderedCustomers = [];
  if (isSearchActive) {
    renderedCustomers = searchedCustomers;
  } else {
    renderedCustomers = customers;
  }

  return (
    <div className="customers-table">
      {/* Table Container */}
      <div className="table-container">
        <div className="table-wrapper">
          {/* Fixed Table Header */}
          <div className="table-head">
            <div className="table-row header-row">
              <div className="table-cell customer-cell">Customer Info</div>
              <div className="table-cell contact-cell">Contact</div>

              <div className="table-cell status-cell">Status</div>
              <div className="table-cell joined-cell">Joined</div>
              <div className="table-cell methods-cell">Login Methods</div>
              <div className="table-cell actions-cell">Actions</div>
            </div>
          </div>

          {/* Scrollable Table Body */}
          {loading ? (
            <div className="customers-table">
              <div className="loading-state">
                <CircularProgress size={20} />
                <p>Loading customers...</p>
              </div>
            </div>
          ) : renderedCustomers.length <= 0 ? (
            <div className="customers-table">
              <div className="empty-state">
                <p>No customers found</p>
              </div>
            </div>
          ) : (
            <div className="table-body">
              {renderedCustomers.map((customer) => {
                const StatusIcon =
                  statusConfig[customer.accountStatus]?.icon || AlertCircle;

                return (
                  <div key={customer.id} className={`table-row data-row`}>
                    {/* Customer Info */}
                    <div className="table-cell customer-cell">
                      <div className="customer-info">
                        <div className="customer-avatar">
                          <User size={20} />
                        </div>
                        <div className="customer-details">
                          <div className="customer-name">
                            {getDisplayName(customer)}
                          </div>
                          <div className="customer-id">
                            <span>UID: {customer.uid}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="table-cell contact-cell">
                      <div className="contact-info">
                        <div className="contact-item">
                          <Mail size={14} />
                          <span>{customer.email}</span>
                        </div>
                        {customer.phoneNumber && (
                          <div className="contact-item">
                            <Phone size={14} />
                            <span>{customer.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="table-cell status-cell">
                      <div className={getStatusClass(customer.accountStatus)}>
                        <StatusIcon size={14} />
                        <span>
                          {statusConfig[customer.accountStatus]?.label ||
                            "Unknown"}
                        </span>
                      </div>
                    </div>

                    {/* Joined Date */}
                    <div className="table-cell joined-cell">
                      <div className="joined-info">
                        <Calendar size={14} />
                        <span>{formatDate(customer.createdAt)}</span>
                      </div>
                    </div>

                    <div className="table-cell login_mentods">
                      {customer.loginMethod?.map((loginm, index) => (
                        <div className="login-method">
                          <span
                            key={index}
                            className={`method-badge ${loginm}`}
                          >
                            {loginm}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Actions */}
                    <div className="table-cell actions-cell">
                      <div className="actions-container">
                        {actions.map((action, index) => (
                          <button
                            key={index}
                            className="action-btn"
                            onClick={() => action.onClick(customer)}
                            title={action.text}
                          >
                            <action.icon size={16} />
                            <span>{action.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomersTable;
