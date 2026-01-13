"use client";
import { useState, useRef, useEffect } from "react";
import { X, MessageSquare, Check, Loader2, AlertCircle } from "lucide-react";
import "./OtpDialog.scss";

const OtpDialog = ({
  isOpen,
  onClose,
  config,
  onSuccess = () => {},
  onError = () => {},
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [success, setSuccess] = useState(false);

  const otpRefs = useRef([]);

  // Default config values
  const defaultConfig = {
    actionName: "Verify Action",
    actionInfo: "Please confirm this action by entering the OTP sent to your registered phone number.",
    confirmText: "Send OTP",
    variant: "primary",
    successMessage: "Verification completed successfully!",
    otpLength: 6,
    autoCloseDelay: 1500,
    endpoints: {
      initiate: "/api/admin/otp/initiate",
      verify: "/api/admin/otp/verify"
    },
    payload: {},
    customValidation: null, // function to run custom validation before sending OTP
    maskPhoneNumber: true
  };

  const finalConfig = { ...defaultConfig, ...config };

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setLoading(false);
      setError("");
      setOtpId("");
      setOtp(new Array(finalConfig.otpLength).fill(""));
      setSuccess(false);
    }
  }, [isOpen, finalConfig.otpLength]);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleProceed = async () => {
    // Run custom validation if provided
    if (finalConfig.customValidation) {
      try {
        const isValid = await finalConfig.customValidation();
        if (!isValid) {
          setError("Validation failed. Please try again.");
          return;
        }
      } catch (validationError) {
        setError(validationError.message || "Validation failed.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(finalConfig.endpoints.initiate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalConfig.payload),
      });

      const data = await response.json();

      if (data.success) {
        setOtpId(data.otpId);
        setStep(3);
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < finalConfig.otpLength - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== finalConfig.otpLength) {
      setError(`Please enter a valid ${finalConfig.otpLength}-digit OTP`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(finalConfig.endpoints.verify, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otpId,
          otp: otpCode,
          ...finalConfig.payload, // Include original payload for context
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(data);
          handleClose();
        }, finalConfig.autoCloseDelay);
      } else {
        setError(data.error || "Invalid OTP. Please try again.");
        setOtp(new Array(finalConfig.otpLength).fill(""));
        setTimeout(() => {
          onError(data);
        }, finalConfig.autoCloseDelay);
        otpRefs.current[0]?.focus();
      }
    } catch (err) {
      setError("Network error. Please try again.");
      onError({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setOtp(new Array(finalConfig.otpLength).fill(""));

    try {
      const response = await fetch(finalConfig.endpoints.initiate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalConfig.payload),
      });

      const data = await response.json();

      if (data.success) {
        setOtpId(data.otpId);
      } else {
        setError(data.error || "Failed to resend OTP");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getVariantClass = () => {
    return `otp-dialog-${finalConfig.variant}`;
  };

  return (
    <div className="otp-overlay">
      <div className={`otp-dialog ${getVariantClass()}`}>
        <div className="otp-header">
          <div className="otp-title">
            {step === 1 && finalConfig.actionName}
            {step === 3 && !success && "Enter Verification Code"}
            {success && "Verification Complete"}
          </div>
          <button
            className="otp-close-btn"
            onClick={handleClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="otp-content">
          {/* Step 1: Confirmation */}
          {step === 1 && (
            <div className="otp-step">
              <div className="otp-icon">
                <MessageSquare size={24} />
              </div>
              <p className="otp-description">{finalConfig.actionInfo}</p>
              {error && (
                <div className="otp-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <div className="otp-actions">
                <button
                  className="otp-btn otp-btn-secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className={`otp-btn otp-btn-${finalConfig.variant}`}
                  onClick={handleProceed}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Sending...
                    </>
                  ) : (
                    finalConfig.confirmText
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Verification */}
          {step === 3 && !success && (
            <div className="otp-step">
              <div className="otp-icon">
                <MessageSquare size={24} />
              </div>
              <p className="otp-description">
                Enter the {finalConfig.otpLength}-digit code sent to{" "}
                <strong>
                  {finalConfig.maskPhoneNumber 
                    ? "your registered phone number" 
                    : finalConfig.phoneNumber || "Admin Phone Number"}
                </strong>
              </p>

              <div className="otp-input-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="otp-input"
                    disabled={loading}
                  />
                ))}
              </div>

              {error && (
                <div className="otp-error">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="otp-actions">
                <button
                  className="otp-btn otp-btn-secondary"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Resending...
                    </>
                  ) : (
                    "Resend Code"
                  )}
                </button>
                <button
                  className={`otp-btn otp-btn-${finalConfig.variant}`}
                  onClick={handleVerify}
                  disabled={loading || otp.join("").length !== finalConfig.otpLength}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="otp-step">
              <div className="otp-icon otp-icon-success">
                <Check size={24} />
              </div>
              <p className="otp-description">
                {finalConfig.successMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpDialog;