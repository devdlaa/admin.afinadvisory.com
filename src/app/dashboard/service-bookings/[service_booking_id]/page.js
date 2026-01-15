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
  UserIcon,
  RefreshCcw,
  Info,
} from "lucide-react";
import "./ServiceBookingPage.scss";

import InfoBanner from "@/app/components/shared/InfoBanner/InfoBanner";
import { Button } from "@/app/components/shared/TinyLib/TinyLib";
import { useSelector, useDispatch } from "react-redux";



import Permission from "@/app/components/Permission";
import AssignmentDialog from "@/app/components/pages/AssignmentDialog/AssignmentDialog";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";

import {
  markServiceFulfilled,
  unmarkServiceFulfilled,
  fetchBookingData,
  rejectRefund,
  updateAssignmentManagement,
} from "@/store/slices/servicesSlice";
import { selectPermissions } from "@/store/slices/sessionSlice";

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

const generateAdminSteps = (
  service,
  main_obj,
  handleConfirmation,
  handleApproveRefund
) => {
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

    if (stepId === "REFUND_REQUESTED" && step?.isCompleted == false) {
      stepObj.actions = [
        {
          label: "Approve Refund",
          type: "secondary",
          icon: <CheckCircle />,
          action: "APPROVE_REFUND",
          onClick: handleApproveRefund,
        },
        {
          label: "Reject Refund",
          type: "primary",
          icon: <XCircle />,
          action: "REJECT_REFUND",
          onClick: () => {
            handleConfirmation();
          },
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

  const [showConfirmationBox, setConfirmationBox] = useState(false);
  const [isAssignmentBoxActive, setAssignmentBox] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [error, setError] = useState(null);

  const permissions = useSelector(selectPermissions);

  // Check if user has permission to assign members
  const hasAssignPermission = permissions?.includes("bookings.assign_member");
  const user = useSelector((state) => state.session.user);
  // Get service booking ID from URL params
  const params = useParams();
  const serviceBookingId = params.service_booking_id;

  const {
    selectedBookings: bookingData,
    service_action,
    bookingLoading,
  } = useSelector((state) => state.services);
  const dispatch = useDispatch();
  const serviceAttchedPaymentId = bookingData?.pay_id;
  const currentLoggedInUserID = user?.uid;
  const isRefundinProgress =
    bookingData?.refundDetails?.current_status === "initiated" &&
    bookingData?.refundDetails.isRefundInProgress === true
      ? true
      : false;
  const isRefundFailed =
    bookingData?.refundDetails?.current_status === "failed" &&
    bookingData?.refundDetails.isRefundInProgress === false
      ? true
      : false;
  const isRefundSuccess =
    bookingData?.refundDetails?.current_status === "refunded" &&
    bookingData?.refundDetails.isRefundInProgress === false
      ? true
      : false;
  const isInvoiceDownloadAvailable =
    (bookingData?.master_status === "processing" &&
      (!bookingData?.refundDetails?.current_status ||
        bookingData?.refundDetails?.current_status === "refunded")) ||
    bookingData?.master_status === "refunded" ||
    bookingData?.master_status === "completed";

  const isServiceStatusMutationAvailable = {
    isAvailable:
      (bookingData?.master_status === "processing" ||
        bookingData?.master_status === "completed" ||
        bookingData?.master_status === "refunded") &&
      !isRefundinProgress,
    type:
      bookingData?.master_status === "processing"
        ? "MARK_COMPLETE"
        : "MARK_UNCOMPLETE",
  };
  // Fetch booking data if not available in Redux
  useEffect(() => {
    if (!bookingData && serviceBookingId) {
      dispatch(fetchBookingData({ serviceBookingId }));
    }
  }, [bookingData, serviceBookingId]);

  // Show loading spinner
  if (bookingLoading) {
    return <LoadingSpinner />;
  }

  // Show error message
  if (error) {
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

  const handleConfirmation = () => {
    setConfirmationBox(true);
  };
  const handleApproveRefund = () => {
    const user = {
      firstName: bookingData?.user_details?.firstName,
      lastName: bookingData?.user_details?.lastName,
      email: bookingData?.user_details?.email,
      mobile: bookingData?.user_details?.phone,
    };
    const service = {
      name: bookingData?.service_details?.service_name,
    };

    if (!serviceBookingId || typeof serviceBookingId !== "string") {
      alert("Not serviceBookingId, Error");
    }
    if (!serviceAttchedPaymentId) {
      alert("Not serviceAttchedPaymentId, Error");
    }

    if (!currentLoggedInUserID) {
      alert("Not currentLoggedInUserID, Error");
    }

   
  };
  const processedSteps = generateAdminSteps(
    bookingData?.progress_steps,
    bookingData,
    handleConfirmation,
    handleApproveRefund
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
    if (isInvoiceDownloadAvailable) {
      if (bookingData) {
        setInvoiceDownloading(true);
     
        setInvoiceDownloading(false);
      }
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

  // Assignment dialog configuration
  const assignmentConfig = {
    selectedItem: bookingData,
    apiEndpoint: "/api/admin/services/assigmnets/assign_members",

    buildPayload: (itemId, assignmentData) => ({
      serviceId: itemId,
      assignmentManagement: assignmentData,
    }),

    onSuccessDispatch: (data) => {
      dispatch(
        updateAssignmentManagement({
          serviceId: bookingData.id,
          assignmentManagement: data.assignmentManagement,
        })
      );
    },

    title: "Assign Team Members to Service",
    subtitle: "Drag and drop users to manage service assignments",

    validateItem: (item) => {
      if (!item?.id) return "No service booking selected";
      return null;
    },
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
        config={assignmentConfig}
        hasPermission={hasAssignPermission}
      />
      

      <ConfirmationDialog
        isOpen={showConfirmationBox}
        onClose={() => setConfirmationBox(false)}
        actionName="Reject Refund Request"
        actionInfo="Once rejected, the refund cannot be undone. Please confirm this action carefully."
        confirmText="Reject Refund"
        variant="danger"
        onConfirm={async () => {
          try {
            // Await the Redux action to complete
            const result = await dispatch(
              rejectRefund({
                service_booking_id: bookingData?.service_booking_id,
                adminNote: "THIS IS A TEST NOTE",
              })
            ).unwrap();

            setConfirmationBox(false);
          } catch (err) {
            console.error("Refund rejection failed:");
            alert("Failed to reject refund. Please try again.");
          }
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

            {isInvoiceDownloadAvailable && (
              <Button
                type="outline"
                size="medium"
                text="Download Invoice"
                icon={DownloadCloudIcon}
                onClick={handleDownloadInvoice}
                className="master_actions_btn download_invoice"
                isLoading={invoiceDownloading}
              />
            )}

            {isServiceStatusMutationAvailable.isAvailable && (
              <>
                {isServiceStatusMutationAvailable.type === "MARK_COMPLETE" ? (
                  <>
                    <Button
                      type="outline"
                      size="medium"
                      text="Mark Fullfilled"
                      icon={CircleCheckBig}
                      onClick={() => {
                        dispatch(
                          markServiceFulfilled([
                            bookingData?.service_booking_id,
                          ])
                        );
                      }}
                      isLoading={service_action}
                      className="master_actions_btn fuffillment"
                    />
                  </>
                ) : isServiceStatusMutationAvailable.type ===
                  "MARK_UNCOMPLETE" ? (
                  <>
                    <Button
                      type="outline"
                      size="medium"
                      text="Un-Mark Funfilled"
                      icon={CircleCheckBig}
                      onClick={() => {
                        dispatch(
                          unmarkServiceFulfilled([
                            bookingData?.service_booking_id,
                          ])
                        );
                      }}
                      isLoading={service_action}
                      className="master_actions_btn fuffillment"
                    />
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>

        {isRefundSuccess ? (
          <InfoBanner
            type="success"
            text="Refund Has Been Credited to Customers Account!"
          />
        ) : isRefundFailed ? (
          <InfoBanner
            type="error"
            text="Refund failed. Please try again."
            ButtonComponent={
              <Button
                type="filled"
                size="medium"
                text="Retry Refund"
                icon={RefreshCcw}
                onClick={null}
                className="master_actions_btn retry_refund"
                isLoading={null}
              />
            }
          />
        ) : isRefundinProgress ? (
          <InfoBanner
            type="info"
            text="Your refund is being processed. This may take a upto 7 Working Days."
          />
        ) : null}

        {/* Refund In Progress */}

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
                            bookingData?.state_wise_extra?.state_chosen}
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
                        #{bookingData?.ticket_info?.ticket_number}
                      </span>
                    </div>
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
                    </div>
                  )}

                  {bookingData?.invoiceNumber && (
                    <div className="info-item">
                      <Info size={22} />
                      <div>
                        <span className="label">Invoice Number</span>
                        <span className="value">
                          {bookingData?.invoiceNumber}
                        </span>
                      </div>
                    </div>
                  )}

                  {bookingData?.refundDetails.creditNoteNumber && (
                    <div className="info-item">
                      <Info size={22} />
                      <div>
                        <span className="label">C/N Number</span>
                        <span className="value">
                          {bookingData?.refundDetails?.creditNoteNumber}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Permission permission="bookings.assign_member">
              {/* Team Assignment */}
              <div className="card invoice-card assignment">
                <div className="card-header">
                  <div className="left_header">
                    <h3>Assigned Team</h3>
                  </div>
                  <div className="right_headder">
                    <Button
                      type="primary"
                      size="medium"
                      text="Update Team"
                      icon={UserPen}
                      onClick={() => setAssignmentBox(true)}
                      className="update_team_btn"
                    />
                    <div
                      className={`status-badge  assignment_badge status-completed`}
                    >
                      <UserCircle size={16} />
                      <span>
                        {bookingData?.assignmentManagement?.assignToAll === true
                          ? "All Assigned"
                          : bookingData?.assignmentManagement?.members.length >
                            0
                          ? `${bookingData?.assignmentManagement?.members.length} Members `
                          : "0 Members"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="card-content">
                  <div className="invoice-info assigned_users_list">
                    {bookingData?.assignmentManagement?.members?.map((user) => (
                      <div key={user.userCode} className={`user-card`}>
                        <div className="user-avatar">
                          <UserIcon size={18} />
                        </div>
                        <div className="user-info">
                          <div className="user-name">{user.name}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {bookingData?.assignmentManagement?.assignToAll && (
                    <p>Assigned to All Users</p>
                  )}
                </div>
              </div>
            </Permission>
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
                      {formatCurrency(
                        bookingData?.payment_details?.offer_price
                      )}
                    </span>
                  </div>

                  {bookingData?.payment_details?.isMultiQuantity && (
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
