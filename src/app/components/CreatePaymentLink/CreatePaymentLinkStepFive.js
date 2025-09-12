import React, { useState } from "react";
import { CircularProgress } from "@mui/material";
import { CreditCard, CheckCircle2, Copy } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";

import { createPaymentLink } from "@/store/slices/createPaymentLink";
// Helper to build coupon object
function buildCouponObject({ couponData, customDiscount, calculatedAmounts }) {
  // If admin applied a coupon code
  if (couponData?.code) {
    return {
      code: couponData.code,
      discount: calculatedAmounts?.discountAmount || 0, // pre-GST discount
      isValid: true, // we assume valid if code exists
      coupon_id: couponData.coupon_id || "",
      influencerId: couponData.influencerId || "", // empty if no influencer
      discountDetails: couponData.discount || {},
    };
  }

  // If admin applied a custom discount
  if (customDiscount && customDiscount?.value) {
    return {
      code: "CUSTOM",
      discount: calculatedAmounts?.discountAmount || 0, // pre-GST discount
      isValid: true,
      coupon_id: "", // no coupon ID
      influencerId: "", // no influencer
      discountDetails: {
        kind: customDiscount.type || "flat",
        amount: customDiscount.value || 0,
      },
    };
  }

  // Default: no coupon applied
  return {
    code: "",
    discount: 0,
    isValid: false,
    coupon_id: "",
    influencerId: "",
    discountDetails: {},
  };
}

const CreatePaymentLinkStepFive = ({ onClose }) => {
  const dispatch = useDispatch();
  const [copiedText, setCopiedText] = useState("");

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
    paymentLink,
    paymentLinkCreated,
    loading,
    error,
  } = useSelector((state) => state.paymentLink);

  const paymentDetailsObject = {
    user: {
      firstName: selectedCustomer?.firstName,
      lastName: selectedCustomer?.lastName,
      mobile: selectedCustomer?.phoneNumber,
      email: selectedCustomer?.email,
      accountStatus: selectedCustomer?.accountStatus,
      address_street: selectedCustomer?.address?.street,
      address_state: selectedCustomer?.address?.state,
      uid: selectedCustomer?.uid,
    },
    service: {
      name: selectedService?.name,
      origin_service_path: selectedService?.slug,
      serviceId: selectedService?.serviceId,
      service_db_id: "",
    },
    plan: {
      planId: selectedPlan?.planId,
      name: selectedPlan?.name,
      features: [], // array if needed
      originalPrice: selectedPlan?.originalPrice,
      offerPrice: selectedPlan?.price,
    },
    state: {
      selectedState: selectedState,
      stateWisePrice: selectedServicePricing?.isMultiState
        ? calculatedAmounts?.basePrice
        : 0,
      isMultiState: selectedServicePricing?.isMultiState,
    },
    quantity: {
      count: quantity,
      isMultiPurchase: selectedServicePricing?.isMultiPurchase,
      maxMultiPurchaseCount: selectedServicePricing?.isMultiPurchase
        ? selectedServicePricing?.maxMultiPurchaseCount
        : 1,
    },
    coupon: buildCouponObject({
      couponData,
      customDiscount,
      calculatedAmounts,
    }),
    payment: {
      adjustedPlanPrice: calculatedAmounts?.basePrice,
      quantityAdjustedPrice: calculatedAmounts?.totalPrice,
      discountAmount: calculatedAmounts?.discountAmount,
      discountedPrice: calculatedAmounts?.finalAmount,
      gstRate: 18,
      gstAmount: calculatedAmounts?.gstAmount,
      finalPayment: calculatedAmounts?.totalWithGst,
    },
    source: "admin_payment_link",
    IS_KIT: false,
    isPaymentRetry: false,
    isPaymentRenew: false,
    isPaymentRetryNew: false,
    checkoutSession: {
      currentOrderId: "",
      updatedOrderID: null,
      isHardRetryAllowed: false,
    },
  };

  const handleCreatePaymentLink = async () => {
    dispatch(createPaymentLink(paymentDetailsObject));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      // Clear the copied status after 2 seconds
      setTimeout(() => {
        setCopiedText("");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="step-content">
      <div className="payment-methods">
        <div className="payment-method selected">
          <div className="method-info">
            <CreditCard size={20} />
            <div>
              <h4>Razorpay Payment Link</h4>
              <p>Secure online payment via Razorpay</p>
            </div>
          </div>
        </div>
      </div>

      {/* Show create button only if payment link is not created */}
      {!paymentLinkCreated && (
        <button
          className="create-link-btn"
          onClick={handleCreatePaymentLink}
          disabled={loading}
        >
          {loading ?  <CircularProgress color="white" size={18} /> : <CreditCard size={18} />}

          {loading ? (
            <>
             
              Creating Payment Link...
            </>
          ) : (
            "Create Payment Link"
          )}
        </button>
      )}

      {/* Show payment link result if created successfully */}
      {paymentLinkCreated && paymentLink && (
        <div className="payment-link-result">
          <div className="success-message">
            <CheckCircle2 size={20} />
            <span>Payment link created successfully!</span>
          </div>

          <div className="link-container">
            <label>Payment Link</label>
            <div className="link-input">
              <input type="text" value={paymentLink?.short_url} readOnly />
              <button
                type="button"
                onClick={() => copyToClipboard(paymentLink?.short_url)}
                className="copy-btn"
                style={{
                  backgroundColor:
                    copiedText === paymentLink?.short_url ? "#10b981" : "",
                  color: copiedText === paymentLink?.short_url ? "white" : "",
                }}
              >
                <Copy size={16} />
                {copiedText === paymentLink?.short_url ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Additional info message */}
          <div
            className="info-message"
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#f0f9ff",
              border: "1px solid #0ea5e9",
              borderRadius: "6px",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "#0369a1" }}>
              Payment link has been created. You can copy the link and share it
              with the customer, or close this dialog.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePaymentLinkStepFive;
