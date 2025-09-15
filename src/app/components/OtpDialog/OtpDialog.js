"use client";
import { useState, useRef, useEffect } from "react";
import { X, MessageSquare, Check, Loader2, AlertCircle } from "lucide-react";
import "./OtpDialog.scss";
const OtpDialog = ({
  isOpen,
  onClose,
  userId,
  phoneNumber,
  actionName,
  actionInfo,
  confirmText,
  actionId = null,
  metaData = null,
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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setLoading(false);
      setError("");
      setOtpId("");
      setOtp(["", "", "", "", "", ""]);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleProceed = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        userId,
        ...(actionId && { actionId }),
        ...(metaData && { metaData }),
      };

      const response = await fetch("/api/admin/otp/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
    if (value && index < 5) {
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
    if (otpCode.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otpId,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess(data);
          handleClose();
        }, 1500);
      } else {
        setError(data.error || "Invalid OTP. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => {
          onError(data);
          handleClose();
        }, 1500);
        otpRefs.current[0]?.focus();
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setOtp(["", "", "", "", "", ""]);

    try {
      const payload = {
        userId,
        phoneNumber,
        ...(actionId && { actionId }),
        ...(metaData && { metaData }),
      };

      const response = await fetch("/api/otp/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

  return (
    <div className="otp-overlay">
      <div className="otp-dialog">
        <div className="otp-header">
          <div className="otp-title">
            {step === 1 && actionName}
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
              <p className="otp-description">{actionInfo}</p>
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
                  className="otp-btn otp-btn-primary"
                  onClick={handleProceed}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Sending...
                    </>
                  ) : (
                    "Send OTP"
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
                Enter the 6-digit code sent to <strong>{phoneNumber}</strong>
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
                  className="otp-btn otp-btn-primary"
                  onClick={handleVerify}
                  disabled={loading || otp.join("").length !== 6}
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
                Phone number verified successfully!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpDialog;
