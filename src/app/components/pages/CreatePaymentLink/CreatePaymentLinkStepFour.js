import React from "react";
import { useSelector } from "react-redux";

const CreatePaymentLinkStepFour = () => {
  const {
    selectedCustomer,
    selectedService,
    selectedPlan,
    selectedState,
    quantity,
    couponData,
    customDiscount,
    calculatedAmounts,
    selectedServicePricing,
  } = useSelector((state) => state.paymentLink);

  return (
    <div className="step-content">
      <div className="review-sections">
        <div className="review-section">
          <h3>Customer Information</h3>
          <div className="review-card">
            <p>
              <strong>Name:</strong> {selectedCustomer?.firstName}{" "}
              {selectedCustomer?.lastName}
            </p>
            <p>
              <strong>Email:</strong> {selectedCustomer?.email}
            </p>
            <p>
              <strong>Phone:</strong> {selectedCustomer?.phoneNumber}
            </p>
            {selectedCustomer?.address?.state && (
              <p>
                <strong>State:</strong> {selectedCustomer.address.state}
              </p>
            )}
          </div>
        </div>

        <div className="review-section">
          <h3>Service Details</h3>
          <div className="review-card">
            <p>
              <strong>Service:</strong> {selectedService?.name}
            </p>
            <p>
              <strong>Service ID:</strong> {selectedService?.serviceId}
            </p>
            <p>
              <strong>Plan:</strong> {selectedPlan?.name}
            </p>
            {selectedState && (
              <p>
                <strong>State:</strong> {selectedState}
              </p>
            )}
            {quantity > 1 && (
              <p>
                <strong>Quantity:</strong> {quantity}
              </p>
            )}
          </div>
        </div>

        {(couponData || customDiscount.value > 0) && (
          <div className="review-section">
            <h3>Discount Applied</h3>
            <div className="review-card">
              {couponData && (
                <>
                  <p>
                    <strong>Coupon Code:</strong> {couponData.code}
                  </p>
                  <p>
                    <strong>Discount:</strong>{" "}
                    {couponData.discount.kind === "percent"
                      ? `${couponData.discount.amount}%`
                      : `₹${couponData.discount.amount}`}
                  </p>
                </>
              )}
              {!couponData && customDiscount.value > 0 && (
                <p>
                  <strong>Custom Discount:</strong>{" "}
                  {customDiscount.type === "percentage"
                    ? `${customDiscount.value}%`
                    : `₹${customDiscount.value}`}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="review-section">
          <h3>Payment Summary</h3>
          <div className="review-card payment-summary">
            <div className="summary-row">
              <span>Base Price:</span>
              <span>₹{calculatedAmounts.basePrice?.toLocaleString()}</span>
            </div>
            {quantity > 1 && (
              <div className="summary-row">
                <span>Quantity ({quantity}):</span>
                <span>₹{calculatedAmounts.totalPrice?.toLocaleString()}</span>
              </div>
            )}
            {calculatedAmounts.discountAmount > 0 && (
              <div className="summary-row discount">
                <span>Discount:</span>
                <span>
                  -₹{calculatedAmounts.discountAmount?.toLocaleString()}
                </span>
              </div>
            )}
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{calculatedAmounts.finalAmount?.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>GST ({selectedServicePricing?.gstRate || 18}%):</span>
              <span>₹{calculatedAmounts.gstAmount?.toLocaleString()}</span>
            </div>
            <div className="summary-row total">
              <span>Total Amount:</span>
              <span>₹{calculatedAmounts.totalWithGst?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePaymentLinkStepFour;