import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import {
  Tag,
  Percent,
  Calculator,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

import {
  setDiscountTab,
  setCouponCode,
  clearCouponData,
  setCustomDiscount,
  validateCoupon,
} from "@/store/slices/createPaymentLink";

const CreatePaymentLinkStepThree = () => {
  const dispatch = useDispatch();
  const {
    discountTab,
    couponCode,
    couponData,
    customDiscount,
    calculatedAmounts,
    selectedServicePricing,
    selectedCustomer,
    selectedService,
    quantity,
    loading,
    error,
  } = useSelector((state) => state.paymentLink);

  const validateCouponCode = async () => {
    if (!couponCode) return;

    dispatch(
      validateCoupon({
        code: couponCode,
        customerId: selectedCustomer?.uid,
        serviceId: selectedService?.serviceId,
      })
    );
  };

  return (
    <div className="step-content">
      <div className="discount-layout">
        <div className="discount-options">
          <div className="tabs">
            <button
              className={`tab ${discountTab === "coupon" ? "active" : ""}`}
              onClick={() => dispatch(setDiscountTab("coupon"))}
            >
              <Tag size={16} />
              Coupon Code
            </button>
            <button
              className={`tab ${discountTab === "custom" ? "active" : ""}`}
              onClick={() => dispatch(setDiscountTab("custom"))}
            >
              <Percent size={16} />
              Custom Discount
            </button>
          </div>

          {discountTab === "coupon" ? (
            <div className="form-section">
              <div className="form-group">
                <label>
                  <Tag size={14} /> Coupon Code
                </label>
                <div className="coupon-input">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => {
                      dispatch(setCouponCode(e.target.value));
                      if (couponData) {
                        dispatch(clearCouponData());
                      }
                    }}
                  />
                  {couponData ? (
                    <>
                      <button
                        type="button"
                        onClick={()=> {
                          dispatch(clearCouponData())
                            dispatch(setCouponCode(""));
                        }}
                        className="validate-btn"
                      >
                        Clear
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={validateCouponCode}
                        disabled={loading || !couponCode}
                        className="validate-btn"
                      >
                        {loading ? (
                          <CircularProgress color="white" size={16} />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </>
                  )}
                </div>
                <p className="form-hint">Enter a valid coupon code</p>
              </div>

              {couponData && (
                <div className="coupon-status valid">
                  <CheckCircle2 size={16} />
                  <span>
                    Coupon applied successfully!{" "}
                    {couponData.discount.kind === "percent"
                      ? `${couponData.discount.amount}% discount`
                      : `₹${couponData.discount.amount} discount`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="form-section">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Percent size={14} /> Discount Type
                  </label>
                  <div className="select-wrapper">
                    <select
                      value={customDiscount.type}
                      onChange={(e) =>
                        dispatch(setCustomDiscount({ type: e.target.value }))
                      }
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <Calculator size={14} /> Discount Value
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      placeholder={
                        customDiscount.type === "percentage"
                          ? "Enter percentage"
                          : "Enter amount"
                      }
                      value={customDiscount.value || ""}
                      onChange={(e) =>
                        dispatch(
                          setCustomDiscount({
                            value: parseFloat(e.target.value) || 0,
                          })
                        )
                      }
                      min="0"
                      max={
                        customDiscount.type === "percentage" ? "100" : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="price-summary">
          <h3>Price Summary</h3>
          <div className="summary-card">
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
              <span>Final Payment:</span>
              <span>₹{calculatedAmounts.totalWithGst?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePaymentLinkStepThree;
