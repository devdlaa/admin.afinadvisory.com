import React from "react";
import {
  X,
  User,
  CreditCard,
  Package,
  Calendar,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import "./ServiceBookingQuickView.scss";

const ServiceBookingQuickView = ({
  isOpen,
  onClose,
  bookingData,
  onViewFullDetails,
}) => {
  if (!isOpen || !bookingData) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      completed: "sbqv__status--completed",
      in_progress: "sbqv__status--progress",
      pending: "sbqv__status--pending",
      cancelled: "sbqv__status--cancelled",
      refunded: "sbqv__status--refunded",
    };
    return statusColors[status] || "sbqv__status--default";
  };



  return (
    <div className="sbqv-overlay">
      <div className="sbqv">
        <div className="sbqv__header">
          <div className="sbqv__header-left">
            <Package size={20} />
            <div>
              <h3>Service Booking Overview</h3>
              <p>#{bookingData.service_booking_id}</p>
            </div>
          </div>
          <button className="sbqv__close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="sbqv__content">
          {/* Service Information */}
          <div className="sbqv__section">
            <div className="sbqv__section-header">
              <Package size={16} />
              <h4>Service Details</h4>
            </div>
            <div className="sbqv__info-grid">
              <div className="sbqv__info-item">
                <span className="sbqv__label">Service Name</span>
                <span className="sbqv__value">
                  {bookingData.service_details.service_name}
                </span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">Plan</span>
                <span className="sbqv__value">
                  {bookingData.plan_details.plan_name}
                </span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">Status</span>
                <span
                  className={`sbqv__status ${getStatusColor(
                    bookingData.master_status
                  )}`}
                >
                  {bookingData.master_status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">Created</span>
                <span className="sbqv__value">
                  {formatDate(bookingData.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="sbqv__section">
            <div className="sbqv__section-header">
              <User size={16} />
              <h4>Customer Details</h4>
            </div>
            <div className="sbqv__info-grid">
              <div className="sbqv__info-item">
                <span className="sbqv__label">Name</span>
                <span className="sbqv__value">
                  {bookingData.user_details.firstName}{" "}
                  {bookingData.user_details.lastName}
                </span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">Phone</span>
                <span className="sbqv__value">
                  <Phone size={12} className="sbqv__icon" />
                  {bookingData.user_details.phone}
                </span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">Email</span>
                <span className="sbqv__value sbqv__value--email">
                  <Mail size={12} className="sbqv__icon" />
                  {bookingData.user_details.email}
                </span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">State</span>
                <span className="sbqv__value">
                  {bookingData.user_details.address.state}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="sbqv__section">
            <div className="sbqv__section-header">
              <CreditCard size={16} />
              <h4>Payment Details</h4>
            </div>
            <div className="sbqv__payment-summary">
              <div className="sbqv__payment-row">
                <span>Offer Price:</span>
                <span className="sbqv__offer-price">
                  {formatCurrency(bookingData.payment_details.offer_price)}
                </span>
              </div>
              <div className="sbqv__payment-row">
                <span>Quantity :</span>
                <span className="sbqv__offer">
                  {bookingData.payment_details.quantity_bought} Nos
                </span>
              </div>
              {bookingData.payment_details.quantity_bought > 1 && (
                <div className="sbqv__payment-row">
                  <span>Sub Total:</span>
                  <span className="sbqv__offer-price">
                    {formatCurrency(
                      bookingData.payment_details.quantityAdjustedAmount
                    )}
                  </span>
                </div>
              )}

              {bookingData.payment_details.discountAmount > 1 && (
                <div className="sbqv__payment-row">
                  <span>Discount:</span>
                  <span className="sbqv__offer">
                    (-)
                    {formatCurrency(bookingData.payment_details.discountAmount)}
                  </span>
                </div>
              )}

              <div className="sbqv__payment-row">
                <span>Price Before Tax:</span>
                <span className="sbqv__offer-price">
                  {formatCurrency(
                    bookingData.payment_details.finalAmountAfterDiscount
                  )}
                </span>
              </div>

              <div className="sbqv__payment-row">
                <span>GST ({bookingData.payment_details.gstRate}%):</span>
                <span>
                  {formatCurrency(bookingData.payment_details.gstAmount)}
                </span>
              </div>
              <div className="sbqv__payment-row sbqv__payment-total">
                <span>Total Paid:</span>
                <span>
                  {formatCurrency(bookingData.payment_details.finalAmountPaid)}
                </span>
              </div>
            </div>
          </div>

          {/* Current Progress */}
          <div className="sbqv__section">
            <div className="sbqv__section-header">
              <Clock size={16} />
              <h4>Current Progress</h4>
            </div>
            <div className="sbqv__progress">
              <div className="sbqv__current-step">
                <span className="sbqv__step-indicator">
                  {bookingData.progress_steps.isFulfilled ? (
                    <CheckCircle size={16} className="sbqv__step-completed" />
                  ) : (
                    <RefreshCw size={16} className="sbqv__step-progress" />
                  )}
                </span>
                <div className="sbqv__step-info">
                  <span className="sbqv__step-name">
                    {bookingData.progress_steps.current_step}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="sbqv__section">
            <div className="sbqv__section-header">
              <FileText size={16} />
              <h4>Additional Information</h4>
            </div>
            <div className="sbqv__info-grid">
              <div className="sbqv__info-item">
                <span className="sbqv__label">Invoice Number</span>
                <span className="sbqv__value">{bookingData.invoiceNumber}</span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">Payment ID</span>
                <span className="sbqv__value">{bookingData.pay_id}</span>
              </div>
              <div className="sbqv__info-item">
                <span className="sbqv__label">Order ID</span>
                <span className="sbqv__value">
                  {bookingData.razorpay_order_id}
                </span>
              </div>
              {bookingData.ticket_info?.isTicketOpen && (
                <div className="sbqv__info-item">
                  <span className="sbqv__label">Support Ticket</span>
                  <span className="sbqv__value sbqv__value--ticket">
                    <AlertCircle size={12} className="sbqv__icon" />#
                    {bookingData.ticket_info.ticket_number}
                  </span>
                </div>
              )}
              {bookingData.isRefundFlagged && (
                <div className="sbqv__info-item">
                  <span className="sbqv__label">Refund Status</span>
                  <span className="sbqv__value sbqv__value--warning">
                    <AlertCircle size={12} className="sbqv__icon" />
                    Refund Flagged
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceBookingQuickView;
