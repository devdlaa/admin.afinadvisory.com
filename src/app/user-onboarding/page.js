"use client";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Info,
  CircleAlert,
} from "lucide-react";
import QRCode from "qrcode";

import "./user-onboarding.scss";

// Create a separate component for the onboarding logic
const OnboardingContent = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 - Password Creation
  const [passwordData, setPasswordData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [inviteToken, setInviteToken] = useState(null);
  const searchParams = useSearchParams();

  // Step 2 - Google Authenticator
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [totpError, setTotpError] = useState("");

  // User data from token (you might want to decode this from the token)
  const [userData, setUserData] = useState({
    email: "",
    name: "",
    company: "AFIN ADVISORY",
  });

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setInviteToken(token);
    }
  }, [searchParams]);

  const validatePassword = () => {
    const errors = {};

    if (!passwordData.password) {
      errors.password = "Password is required";
    } else if (passwordData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(
        passwordData.password
      )
    ) {
      errors.password =
        "Password must contain uppercase, lowercase, number, and special character";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (passwordData.password !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePassword()) return;
    if (!inviteToken) {
      return;
    }

    setIsLoading(true);
    setPasswordErrors({});

    try {
      const response = await fetch(
        "/api/admin/onboarding/initiate-onboarding",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: inviteToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors from Zod
          const errorMap = {};
          data.errors.forEach((error) => {
            errorMap[error.field] = error.message;
          });
          setPasswordErrors(errorMap);
        } else {
          setPasswordErrors({
            general: data.error || "An error occurred while creating password",
          });
        }
        return;
      }

      if (data.success && data.qrCodeUrl) {
        await generateQRCodeFromUrl(data.qrCodeUrl);
        setCurrentStep(2);
      } else {
        setPasswordErrors({
          general: "Failed to initialize two-factor authentication",
        });
      }
    } catch (error) {
      console.error("Password creation error:", error);
      setPasswordErrors({
        general: "Network error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCodeFromUrl = async (otpauthUrl) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#111827",
          light: "#FFFFFF",
        },
      });

      setQrDataUrl(qrDataUrl);

      // Extract secret from otpauth URL for manual entry option
      const urlParams = new URLSearchParams(otpauthUrl.split("?")[1]);
      const secret = urlParams.get("secret");
      if (secret) {
        setSecretKey(secret);
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();

    if (!totpCode || totpCode.length !== 6) {
      setTotpError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setTotpError("");

    try {
      const response = await fetch("/api/admin/onboarding/verify-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: inviteToken,
          password: passwordData.password,
          totpCode: totpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors
          const totpError = data.errors.find((e) =>
            e.field.includes("totpCode")
          );
          setTotpError(totpError ? totpError.message : data.error);
        } else {
          setTotpError(data.error || "Invalid TOTP code");
        }
        return;
      }

      if (data.success) {
        setCurrentStep(3);
      } else {
        setTotpError("Verification failed. Please try again.");
      }
    } catch (error) {
      console.error("TOTP verification error:", error);
      setTotpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleRedirectToLogin = () => {
    // Replace with actual navigation logic
    window.location.href = "/login";
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="ob-onboarding-container">
      <div className="ob-onboarding-card">
        {/* Header */}
        <div className="ob-step-header">
          <img src={"/assets/svg/afin_admin_logo.svg"} />
        </div>

        {/* Steps */}
        <div className="ob-steps-container">
          <AnimatePresence mode="wait">
            {/* Step 1: Create Password */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="ob-step"
              >
                <form onSubmit={handlePasswordSubmit} className="ob-form">
                  {passwordErrors.general && (
                    <div className="ob-error-banner">
                      <CircleAlert size={16} color="#cf4141" />
                      {passwordErrors.general}
                    </div>
                  )}

                  <div className="ob-form-group">
                    <label className="ob-form-label">Password</label>
                    <div className="ob-password-input">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`ob-form-input ${
                          passwordErrors.password ? "ob-error" : ""
                        }`}
                        value={passwordData.password}
                        onChange={(e) => {
                          setPasswordData((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }));
                          if (passwordErrors.password) {
                            setPasswordErrors((prev) => ({
                              ...prev,
                              password: "",
                            }));
                          }
                        }}
                        placeholder="Enter your password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="ob-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {passwordErrors.password && (
                      <span className="ob-error-text">
                        {passwordErrors.password}
                      </span>
                    )}
                  </div>

                  <div className="ob-form-group">
                    <label className="ob-form-label">Confirm Password</label>
                    <div className="ob-password-input">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className={`ob-form-input ${
                          passwordErrors.confirmPassword ? "ob-error" : ""
                        }`}
                        value={passwordData.confirmPassword}
                        onChange={(e) => {
                          setPasswordData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }));
                          if (passwordErrors.confirmPassword) {
                            setPasswordErrors((prev) => ({
                              ...prev,
                              confirmPassword: "",
                            }));
                          }
                        }}
                        placeholder="Confirm your password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="ob-password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <span className="ob-error-text">
                        {passwordErrors.confirmPassword}
                      </span>
                    )}
                  </div>

                  <div className="ob-password-requirements">
                    <h4>Password must contain:</h4>
                    <ul>
                      <li>At least 8 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                      <li>One special character (@$!%*?&)</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    className="ob-continue-btn"
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="ob-loading-spinner"
                      />
                    )}
                    {isLoading ? "Creating..." : "Continue"}
                    {!isLoading && <ArrowRight size={16} />}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Setup Google Authenticator */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="ob-step"
              >
                <div className="ob-2fa-setup">
                  <div className="ob-qr-section">
                    <div className="ob-qr-container">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="QR Code"
                          className="ob-qr-code"
                        />
                      )}
                    </div>

                    {/* Manual entry option */}
                  </div>

                  <form onSubmit={handleTotpSubmit} className="ob-totp-form">
                    <div className="ob-form-group">
                      <label className="ob-form-label inst">
                        <Info size={20} />
                        <div>
                          Download Google Authenticator App <br />
                          <span>
                            Enter 6-digit code from your authenticator app
                          </span>
                        </div>
                      </label>
                      <input
                        type="text"
                        className={`ob-form-input ob-totp-input ${
                          totpError ? "ob-error" : ""
                        }`}
                        value={totpCode}
                        onChange={(e) => {
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setTotpCode(value);
                          if (totpError) setTotpError("");
                        }}
                        placeholder="123456"
                        maxLength={6}
                        disabled={isLoading}
                      />
                      {totpError && (
                        <span className="ob-error-text">{totpError}</span>
                      )}
                    </div>

                    <div className="ob-form-actions">
                      <button
                        type="button"
                        className="ob-back-btn"
                        onClick={() => setCurrentStep(1)}
                        disabled={isLoading}
                      >
                        <ArrowLeft size={16} />
                        Back
                      </button>
                      <button
                        type="submit"
                        className="ob-verify-btn"
                        disabled={isLoading || totpCode.length !== 6}
                      >
                        {isLoading && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="ob-loading-spinner"
                          />
                        )}
                        {isLoading ? "Verifying..." : "Verify & Continue"}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="ob-step ob-success-step"
              >
                <div className="ob-success-content">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="ob-success-icon"
                  >
                    🎉
                  </motion.div>

                  <h2>Your account is ready!</h2>
                  <p>
                    Welcome to {userData.company}, {userData.name}! Your account
                    has been successfully set up with two-factor authentication.
                  </p>

                  <button
                    className="ob-login-btn"
                    onClick={handleRedirectToLogin}
                  >
                    Continue to Login
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="ob-footer">
          <p>
            Need help? Contact{" "}
            <a href="mailto:support@company.com">info@afinadvisory.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Loading fallback component
const OnboardingFallback = () => (
  <div className="ob-onboarding-container">
    <div className="ob-onboarding-card">
      <div className="ob-step-header">
        <img src={"/assets/svg/afin_admin_logo.svg"} />
      </div>
      <div className="ob-steps-container">
        <div className="ob-loading-container">
          <div className="ob-loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    </div>
  </div>
);

// Main component wrapped with Suspense
const Page = () => {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent />
    </Suspense>
  );
};

export default Page;
