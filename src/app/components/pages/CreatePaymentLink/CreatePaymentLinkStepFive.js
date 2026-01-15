import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Wallet, DollarSign, AlertCircle } from "lucide-react";

import CustomInput from "../../shared/TinyLib/CustomInput";


const CreatePaymentLinkStepFive = () => {
  const dispatch = useDispatch();
  const {
    paymentType,
    partialAmount,
    calculatedAmounts,
  } = useSelector((state) => state.paymentLink);

  const totalAmount = calculatedAmounts?.totalWithGst || 0;

  const handlePaymentTypeSelect = (type) => {
    // dispatch(setPaymentType(type));
    if (type === "full") {
      // dispatch(setPartialAmount(totalAmount));
    }
  };

  const handlePartialAmountChange = (value) => {
    const amount = parseFloat(value) || 0;
    // dispatch(setPartialAmount(amount));
  };

  const isPartialAmountValid =
    partialAmount > 0 && partialAmount <= totalAmount;
  const isPartialAmountSameAsTotal = partialAmount === totalAmount;

  return (
    <div className="step-content">
      <div className="payment-type-section">
        <h3>Select Payment Type</h3>
        <p className="section-description">
          Choose how the customer will pay for this service
        </p>

        <div className="payment-type-grid">
          <div
            className={`payment-type-card ${
              paymentType === "full" ? "selected" : ""
            }`}
            onClick={() => handlePaymentTypeSelect("full")}
          >
            <div className="card-icon">
              <Wallet size={24} />
            </div>
            <div className="card-content">
              <h4>Full Payment</h4>
              <p>Customer pays the entire amount</p>
              <div className="amount-display">
                ₹{totalAmount.toLocaleString()}
              </div>
            </div>
          </div>

          <div
            className={`payment-type-card ${
              paymentType === "partial" ? "selected" : ""
            }`}
            onClick={() => handlePaymentTypeSelect("partial")}
          >
            <div className="card-icon">
              <DollarSign size={24} />
            </div>
            <div className="card-content">
              <h4>Partial Payment</h4>
              <p>Customer pays a portion now</p>
              <div className="amount-display">Custom Amount</div>
            </div>
          </div>
        </div>

        {paymentType === "partial" && (
          <div className="partial-payment-config">
            <div className="amount-info-card">
              <div className="info-row">
                <span>Total Amount:</span>
                <span className="amount">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <CustomInput
              label="Partial Payment Amount"
              type="number"
              placeholder="Enter amount"
              value={partialAmount || ""}
              onChange={handlePartialAmountChange}
              required
              icon={<DollarSign size={16} />}
              helperText={`Maximum amount: ₹${totalAmount.toLocaleString()}`}
            />

            {partialAmount > totalAmount && (
              <div className="validation-message error">
                <AlertCircle size={16} />
                <span>
                  Partial amount cannot exceed total amount of ₹
                  {totalAmount.toLocaleString()}
                </span>
              </div>
            )}

            {isPartialAmountSameAsTotal && partialAmount > 0 && (
              <div className="validation-message warning">
                <AlertCircle size={16} />
                <span>
                  Amount is same as total. Please select "Full Payment" instead.
                </span>
              </div>
            )}

            {isPartialAmountValid && !isPartialAmountSameAsTotal && (
              <div className="amount-breakdown">
                <div className="breakdown-row">
                  <span>Paying Now:</span>
                  <span className="highlight">
                    ₹{partialAmount.toLocaleString()}
                  </span>
                </div>
                <div className="breakdown-row">
                  <span>Remaining:</span>
                  <span>₹{(totalAmount - partialAmount).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePaymentLinkStepFive;