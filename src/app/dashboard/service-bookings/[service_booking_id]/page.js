"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  CreditCard,
  User,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  RefreshCw,
  Copy,
  Mail,
  Phone,
  Receipt,
  Tag,
  AlertCircle,
  Package,
  IndianRupee,
  Download,
  Check,
  CheckCircleIcon,
  TriangleAlert,
  ArrowUpRight,
  CirclePercent,
  MessageCircleMore,
  Siren,
  Clock3,
  XCircle,
  UserCircle,
  UserPen,
  DownloadCloudIcon,
  CircleCheckBig,
  Loader2,
} from "lucide-react";
import "./ServiceBookingPage.scss";
import { Button } from "@/app/components/TinyLib/TinyLib";
import OtpDialog from "@/app/components/OtpDialog/OtpDialog";
import { useSelector, useDispatch } from "react-redux";
import { downloadInvoice } from "@/utils/invoiceUtil";

import AssignmentDialog from "@/app/components/AssignmentDialog/AssignmentDialog";
import ConfirmationDialog from "@/app/components/ConfirmationDialog/ConfirmationDialog";

// ===== UTILITY FUNCTIONS =====

const getStatusConfig = (status) => {
  const statusMap = {
    completed: {
      icon: <CheckCircle size={20} />,
      className: "completed",
    },
    pending: {
      icon: <Siren size={20} />,
      className: "active",
    },
    processing: {
      icon: <Clock3 size={20} />,
      className: "processing",
    },
    success: {
      icon: <CheckCircle size={20} />,
      className: "success",
    },
    refund_initiated: {
      icon: <RefreshCw size={20} />,
      className: "refund-initiated",
    },
    refund_requested: {
      icon: <RefreshCw size={20} />,
      className: "refund-requested",
    },
    refund_success: {
      icon: <CheckCircle size={20} />,
      className: "refund-success",
    },
    refund_rejected: {
      icon: <XCircle size={20} />,
      className: "refund-rejected",
    },
  };

  return statusMap[status] || { icon: null, className: "default" };
};

const generateAdminSteps = (service, main_obj) => {
  const steps = service?.steps || {};
  const masterStatus = main_obj?.master_status || "";
  const refund = main_obj?.refundDetails || {};
  const stepKeys = Object.keys(steps).sort((a, b) => Number(a) - Number(b));

  return stepKeys.map((key) => {
    const step = steps[key];
    const stepId = step.step_id;

    let subtitle = step.step_desc?.trim() || "";
    let title = step.step_name?.trim() || "Step";
    let status = step?.isCompleted ? "completed" : "pending";

    // Admin-specific overrides
    switch (stepId) {
      case "SERVICE_REQUESTED":
        subtitle = "Customer booked the service.";
        break;

      case "PAYMENT_COMPLETED":
        if (masterStatus === "payment_pending") {
          subtitle = "Payment is still pending.";
          status = "pending";
        } else if (step?.isCompleted) {
          subtitle = "Payment confirmed.";
          status = "completed";
        }
        break;

      case "SERVICE_IN_PROGRESS":
        status = masterStatus === "processing" ? "processing" : status;
        subtitle = "Team is working on this service.";
        break;

      case "SERVICE_FULFILLED":
        status = "success";
        subtitle = "Service has been completed.";
        break;

      case "REFUND_REQUESTED":
        status = "refund_requested";
        subtitle = "Customer requested a refund.";
        break;

      case "REFUND_INITIATED":
        status = "refund_initiated";
        subtitle = "Refund initiated from admin side.";
        break;

      case "REFUND_COMPLETED":
        status = "refund_success";
        subtitle = "Refund successfully processed.";
        break;

      case "REFUND_REJECTED":
        status = "refund_rejected";
        subtitle = refund?.admin_notes || "Refund request was rejected.";
        break;
    }

    const stepObj = {
      title,
      subtitle,
      status,
    };

    if (stepId === "REFUND_REQUESTED" && !step.isCompleted) {
      stepObj.actions = [
        {
          label: "Approve Refund",
          type: "secondary",
          icon: <CheckCircle />,
          action: "APPROVE_REFUND",
        },
        {
          label: "Reject Refund",
          type: "primary",
          icon: <XCircle />,
          action: "REJECT_REFUND",
        },
      ];
    }

    return stepObj;
  });
};

const ProgressSoFar = ({ steps = [] }) => {
  return (
    <div className="progress-container">
      <div className="progress-header">
        <h3 className="progress-title">Progress So Far</h3>
        <p className="progress-subtitle">
          You are almost there to complete this request.
        </p>
      </div>

      <div className="progress-steps">
        {steps.map((step, index) => {
          const { icon, className } = getStatusConfig(step.status);
          const isLast = index === steps.length - 1;

          return (
            <div key={index} className={`progress-step ${className}`}>
              {/* Connecting line */}
              {!isLast && <div className="step-line" />}

              {/* Step indicator */}
              <div className="step-indicator">
                {step.status === "default" ? (
                  <span className="step-number">{index + 1}</span>
                ) : (
                  icon
                )}
              </div>

              {/* Step content */}
              <div className="step-content">
                <h4 className="step-title">{step.title}</h4>
                {step.subtitle && (
                  <p className="step-subtitle">{step.subtitle}</p>
                )}

                {/* Action buttons */}
                {step.actions && (
                  <div className="step-actions">
                    {step.actions.map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        className={`action-btn ${action.type || "secondary"}`}
                        onClick={action.onClick}
                      >
                        {action.icon && (
                          <span className="action-icon">{action.icon}</span>
                        )}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Loading component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-content">
      <Loader2 size={40} className="animate-spin" />
      <h2>Loading Booking Details...</h2>
      <p>Please wait while we fetch the service booking information.</p>
    </div>
  </div>
);

// Error component
const ErrorMessage = ({ error, onRetry }) => (
  <div className="error-container">
    <div className="error-content">
      <AlertCircle size={40} className="error-icon" />
      <h2>Error Loading Booking</h2>
      <p>{error}</p>
      <Button
        type="primary"
        size="medium"
        text="Try Again"
        onClick={onRetry}
        className="retry-btn"
      />
    </div>
  </div>
);

export default function ServiceBookingPage() {
  const [copiedField, setCopiedField] = useState("");
  const [showOtp, setShowOtp] = useState(true);
  const [isAssignmentBoxActive, setAssignmentBox] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedBookingData, setFetchedBookingData] = useState(null);

  // Get service booking ID from URL params
  const params = useParams();
  const serviceBookingId = params.service_booking_id;

  const { selectedBookings } = useSelector((state) => state.services);
  const dispatch = useDispatch();

  // Determine which booking data to use
  const bookingData = selectedBookings || fetchedBookingData;

  // Function to fetch booking data from API
  const fetchBookingData = async (retryCount = 0) => {
    if (!serviceBookingId) {
      setError("Service booking ID not found in URL");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/services/get_service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_booking_id: serviceBookingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch booking data");
      }

      if (data.success) {
        setFetchedBookingData(data.booking);
        
        // Optionally dispatch to Redux store for future use
        // dispatch(setSelectedBooking(data.booking));
      } else {
        throw new Error(data.error || "Failed to fetch booking data");
      }
    } catch (err) {
      console.error("Error fetching booking data:", err);
      
      // Retry logic for network errors
      if (retryCount < 2 && (err.name === 'TypeError' || err.message.includes('fetch'))) {
        setTimeout(() => fetchBookingData(retryCount + 1), 1000);
        return;
      }
      
      setError(err.message || "Failed to load booking data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch booking data if not available in Redux
  useEffect(() => {
    if (!selectedBookings && serviceBookingId) {
      fetchBookingData();
    }
  }, [selectedBookings, serviceBookingId]);

  // Show loading spinner
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show error message
  if (error && !bookingData) {
    return <ErrorMessage error={error} onRetry={() => fetchBookingData()} />;
  }

  // Show error if no booking data available
  if (!bookingData) {
    return (
      <ErrorMessage 
        error="No booking data available" 
        onRetry={() => fetchBookingData()} 
      />
    );
  }

  // Dummy data for initially assigned users (from Redux)
  const team_assigned = {
    isAssignedToAll: false,
    dummyAssignedUsers: [
      {
        userCode: "U001",
        name: "John Doe",
        email: "john@example.com",
        avatar: "JD",
      },
      {
        userCode: "U002",
        name: "Jane Smith",
        email: "jane@example.com",
        avatar: "JS",
      },
      {
        userCode: "U001",
        name: "John Doe",
        email: "john@example.com",
        avatar: "JD",
      },
      {
        userCode: "U002",
        name: "Jane Smith",
        email: "jane@example.com",
        avatar: "JS",
      },
      {
        userCode: "U001",
        name: "John Doe",
        email: "john@example.com",
        avatar: "JD",
      },
      {
        userCode: "U002",
        name: "Jane Smith",
        email: "jane@example.com",
        avatar: "JS",
      },
    ],
  };

  const processedSteps = generateAdminSteps(
    bookingData?.progress_steps,
    bookingData
  );

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(""), 1000);
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadInvoice = () => {
    if (bookingData) {
      setInvoiceDownloading(true);
      downloadInvoice(bookingData);
      setInvoiceDownloading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "processing":
        return "status-processing";
      case "completed":
        return "status-completed";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-pending";
    }
  };

  // Updated copy button component - only shows icons
  const CopyButton = ({ text, fieldName, size = 16 }) => (
    <button
      className="copy-btn-icon"
      onClick={() => copyToClipboard(text, fieldName)}
      title="Copy to clipboard"
    >
      {copiedField === fieldName ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );

  return (
    <div className="service-booking-page">
      <AssignmentDialog
        isOpen={isAssignmentBoxActive}
        onClose={() => setAssignmentBox(false)}
      />
      <OtpDialog
        isOpen={false}
        onClose={() => setShowOtp(false)}
        userId="user123"
        phoneNumber="+1234567890"
        actionId="optional-action" // Optional
        metaData={{ key: "value" }} // Optional
        onSuccess={(data) => ("OTP verified:", data)}
        onError={(error) => console.log("Error:", error)}
      />
      <ConfirmationDialog
        isOpen={false}
        onClose={null}
        actionName="Delete User Account"
        actionInfo="This will permanently remove all user data and cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={async () => {
          console.log("action here on confirmation");
        }}
      />
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>Service Booking Details</h1>
            <div className="booking-id">
              <span>Booking ID: {bookingData.service_booking_id}</span>
              <CopyButton
                text={bookingData.service_booking_id}
                fieldName="booking-id"
              />
            </div>
          </div>
          <div className="master_actions_service_page">
            <div
              className={`status-badge ${getStatusColor(
                bookingData.master_status
              )}`}
            >
              {bookingData.master_status === "processing" && (
                <Clock size={16} />
              )}
              {bookingData.master_status === "completed" && (
                <CheckCircle size={16} />
              )}
              {bookingData.master_status === "cancelled" && (
                <AlertCircle size={16} />
              )}
              <span>{bookingData.master_status.toUpperCase()}</span>
            </div>
            <Button
              type="outline"
              size="medium"
              text="Download Invoice"
              icon={DownloadCloudIcon}
              onClick={handleDownloadInvoice}
              className="master_actions_btn download_invoice"
              isLoading={invoiceDownloading}
            />
            <Button
              type="outline"
              size="medium"
              text="Mark Fullfilled"
              icon={CircleCheckBig}
              onClick={null}
              className="master_actions_btn fuffillment"
            />
          </div>
        </div>

        <div className="content-grid">
          <div className="spz_row1">
            {/* Service Details Card */}
            <div className="card service-card">
              <div className="card-header">
                <Package size={22} />
                <h3>Service Details</h3>
              </div>
              <div className="card-content">
                <div className="service-info">
                  <div className="service-name">
                    {bookingData.service_details.service_name}
                  </div>
                  <div className="service-meta">
                    <div className="service-id-row">
                      <span>
                        Service ID: {bookingData.service_details.service_id}
                      </span>
                      <CopyButton
                        text={bookingData.service_details.service_id}
                        fieldName="service-id"
                        size={12}
                      />
                    </div>
                  </div>
                </div>
                <div className="plan-info">
                  <div className="plan-name">
                    {bookingData.plan_details.plan_name} Plan
                  </div>
                  <div className="plan-pricing">
                    <span className="original-price">
                      {formatCurrency(
                        bookingData.plan_details.plan_original_price
                      )}
                    </span>
                    <span className="offer-price">
                      {formatCurrency(
                        bookingData.plan_details.plan_offer_price
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details Card */}
            <div className="card customer-card">
              <div className="card-header">
                <User size={20} />
                <h3>Customer Details</h3>
              </div>
              <div className="card-content">
                <div className="customer-info">
                  <div className="customer-name">
                    {bookingData.user_details.firstName}{" "}
                    {bookingData.user_details.lastName}
                  </div>
                  <div className="contact-details">
                    <div className="contact-item">
                      <Mail size={16} />
                      <span>{bookingData.user_details.email}</span>
                      <CopyButton
                        text={bookingData.user_details.email}
                        fieldName="email"
                        size={12}
                      />
                    </div>
                    <div className="contact-item">
                      <Phone size={16} />
                      <span>{bookingData.user_details.phone}</span>
                      <CopyButton
                        text={bookingData.user_details.phone}
                        fieldName="phone"
                        size={12}
                      />
                    </div>

                    <div className="contact-item uid">
                      <User size={16} />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          width: "100%",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                          }}
                        >
                          User ID
                        </span>
                        <span
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          {bookingData?.user_details?.uid.toUpperCase()}
                          <CopyButton
                            text={bookingData.user_details.uid}
                            fieldName="uid"
                            size={12}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice & Ticket Info Card */}
            <div className="card invoice-card">
              <div className="card-header">
                <FileText size={20} />
                <h3>Misc Details</h3>
              </div>
              <div className="card-content">
                <div className="invoice-info">
                  <div className="info-item">
                    <IndianRupee size={22} />
                    <div className="split">
                      <span className="label">Payment Method</span>
                      <span className="value">
                        {(() => {
                          const { bank, wallet, card_id, method } =
                            bookingData.payment_method;

                          // Pick the first non-empty value
                          const value = bank || wallet || card_id || method;

                          return value && value.trim() !== "" ? value : "N/A";
                        })()}
                      </span>
                    </div>
                    <CopyButton
                      text={bookingData.invoiceNumber}
                      fieldName="invoice"
                      size={12}
                    />
                  </div>
                  <div className="info-item">
                    <Clock size={22} />
                    <div className="split">
                      <span className="label">Booking Date</span>
                      <span className="value">
                        {formatDate(bookingData.created_at)}
                      </span>
                    </div>
                  </div>
                  {bookingData.state_wise_extra && (
                    <div className="info-item">
                      <Receipt size={22} />
                      <div className="split">
                        <span className="label">State Choosen</span>
                        <span className="value">
                          {bookingData?.state_wise_extra &&
                            bookingData.state_wise_extra?.state_chosen}
                        </span>
                      </div>
                      <CopyButton
                        text={bookingData.invoiceNumber}
                        fieldName="invoice"
                        size={12}
                      />
                    </div>
                  )}

                  <div className="info-item">
                    <Tag size={22} />
                    <div>
                      <span className="label">Support Ticket</span>
                      <span className="value">
                        #{bookingData.ticket_info.ticket_number}
                      </span>
                    </div>
                    <a
                      style={{
                        textDecoration: "none",
                      }}
                      href={`https://tickets.afinadvisory.com/#ticket/zoom/${bookingData?.ticket_info?.ticket_id}`}
                      target="_blank"
                    >
                      <div
                        className={`ticket-status ${
                          bookingData.ticket_info.isTicketOpen
                            ? "open"
                            : "closed"
                        }`}
                      >
                        {bookingData.ticket_info.isTicketOpen
                          ? "View in Zammad"
                          : "Not Available"}
                        <ArrowUpRight size={16} />
                      </div>
                    </a>
                  </div>
                  {bookingData?.coupon?.code && (
                    <div className="info-item">
                      <CirclePercent size={22} />
                      <div>
                        <span className="label">Coupon Code</span>
                        <span className="value">
                          {bookingData?.coupon?.code}
                        </span>
                      </div>

                      <a
                        style={{
                          textDecoration: "none",
                        }}
                        href={`${process.env.NEXT_PUBLIC_WEB_URL}dashboard/marketing/coupon/${bookingData?.coupon?.code}`}
                        target="_blank"
                      >
                        <div
                          className={`ticket-status ${
                            bookingData.ticket_info.isTicketOpen
                              ? "open"
                              : "closed"
                          }`}
                        >
                          View Coupon
                          <ArrowUpRight size={16} />
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Team Assignment */}
            <div className="card invoice-card assignment">
              <div className="card-header">
                <div className="left_header">
                  <h3>Assigned Team</h3>
                </div>
                <div className="right_headder">
                  <div
                    className={`status-badge  assignment_badge status-completed`}
                  >
                    <UserCircle size={16} />
                    <span>{`${team_assigned?.dummyAssignedUsers.length} Members`}</span>
                  </div>
                </div>
              </div>
              <div className="card-content">
                <div className="invoice-info assigned_users_list">
                  {team_assigned?.dummyAssignedUsers?.map((user) => (
                    <div key={user.userCode} className={`user-card`}>
                      <div className="user-avatar">{user.avatar}</div>
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card_action_footer">
                <Button
                  type="primary"
                  size="medium"
                  text="Update Team"
                  icon={UserPen}
                  onClick={() => setAssignmentBox(true)}
                  className="update_team_btn"
                />
              </div>
            </div>
          </div>

          <div className="spz_row2">
            {/* Payment Details Card */}
            <div className="card payment-card">
              <div className="card-header">
                <CreditCard size={20} />
                <h3>Payment Details</h3>
              </div>

              <div className="card-content">
                <div className="payment-summary">
                  {/* Base Price */}
                  <div className="payment-row">
                    <span>Base Price</span>
                    <span>
                      {formatCurrency(bookingData.payment_details.offer_price)}
                    </span>
                  </div>

                  {bookingData.payment_details.isMultiQuantity && (
                    <div className="payment-row">
                      <span>Quantity</span>
                      <span>{bookingData.payment_details.quantity_bought}</span>
                    </div>
                  )}

                  {bookingData.payment_details.isMultiQuantity && (
                    <div className="payment-row">
                      <span>Amount (Qty Adjusted)</span>
                      <span>
                        {formatCurrency(
                          bookingData.payment_details.quantityAdjustedAmount
                        )}
                      </span>
                    </div>
                  )}

                  {/* Discount - always show, even if 0 */}
                  <div className="payment-row discount">
                    <span>Discount</span>
                    <span>
                      (-){" "}
                      {bookingData.payment_details.discountAmount > 0
                        ? `-${formatCurrency(
                            bookingData.payment_details.discountAmount
                          )}`
                        : formatCurrency(0)}
                    </span>
                  </div>

                  {/* Amount after discount */}
                  <div className="payment-row">
                    <span>Amount After Discount</span>
                    <span>
                      {formatCurrency(
                        bookingData.payment_details.finalAmountAfterDiscount
                      )}
                    </span>
                  </div>

                  {/* GST */}
                  <div className="payment-row">
                    <span>GST ({bookingData.payment_details.gstRate}%)</span>
                    <span>
                      {formatCurrency(bookingData.payment_details.gstAmount)}
                    </span>
                  </div>

                  {/* Total Amount */}
                  <div className="payment-row total">
                    <span>Total Amount Paid</span>
                    <span>
                      {formatCurrency(
                        bookingData.payment_details.finalAmountPaid
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer section */}
                <div className="payment-footer">
                  {!bookingData.isPaymentPending ? (
                    <div className="payment-method">
                      <CheckCircleIcon size={18} />
                      <span>Payment processed successfully</span>
                    </div>
                  ) : (
                    <div className="payment-method err">
                      <TriangleAlert size={18} />
                      <span>Payment is Pending</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-content">
                <div className="order-info">
                  <div className="info-item">
                    <span className="label">Razorpay Order ID</span>
                    <div className="value-with-copy">
                      <span className="value">
                        {bookingData.razorpay_order_id}
                      </span>
                      <CopyButton
                        text={bookingData.razorpay_order_id}
                        fieldName="razorpay-order"
                        size={12}
                      />
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="label">Payment ID</span>
                    <div className="value-with-copy">
                      <span className="value">{bookingData.pay_id}</span>
                      <CopyButton
                        text={bookingData.pay_id}
                        fieldName="payment-id"
                        size={12}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <ProgressSoFar steps={processedSteps} />
          </div>
        </div>
      </div>
    </div>
  );
}