"use client";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Info,
  CircleAlert,
  ShieldCheck,
} from "lucide-react";

import "./reset-password.scss";

// Create a separate component for the password reset logic
const PasswordResetContent = () => {
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
  const [resetToken, setResetToken] = useState(null);
  const searchParams = useSearchParams();

  // Step 2 - TOTP Verification
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");

  // User data from successful reset
  const [userData, setUserData] = useState({
    email: "",
    name: "",
  });

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setResetToken(token);
    } else {
      setPasswordErrors({
        general: "Invalid reset link. Please request a new password reset.",
      });
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

  const handlePasswordContinue = (e) => {
    e.preventDefault();

    if (!validatePassword()) return;
    if (!resetToken) {
      setPasswordErrors({
        general: "Reset token is missing. Please use the link from your email.",
      });
      return;
    }

    // Move to Step 2 without making API call
    setCurrentStep(2);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!totpCode || totpCode.length !== 6) {
      setTotpError("Please enter a valid 6-digit code");
      return;
    }

    if (!resetToken) {
      setTotpError("Reset token is missing");
      return;
    }

    setIsLoading(true);
    setTotpError("");

    try {
      const response = await fetch("/api/auth/reset-identity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetToken,
          password: passwordData.password,
          confirm_password: passwordData.confirmPassword,
          totpCode: totpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors from Zod
          const totpErrorField = data.errors.find((e) =>
            e.field.includes("totpCode")
          );
          const passwordErrorField = data.errors.find((e) =>
            e.field.includes("password")
          );

          if (totpErrorField) {
            setTotpError(totpErrorField.message);
          } else if (passwordErrorField) {
            // Go back to step 1 if password validation failed on server
            setPasswordErrors({ general: passwordErrorField.message });
            setCurrentStep(1);
          } else {
            setTotpError(data.error || "An error occurred");
          }
        } else {
          setTotpError(data.error || "Password reset failed");
        }
        return;
      }

      if (data.success && data.data) {
        setUserData({
          email: data.data.email,
          name: data.data.name,
        });
        setCurrentStep(3);
      } else {
        setTotpError("Password reset failed. Please try again.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setTotpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirectToLogin = () => {
    window.location.href = "/login";
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="pr-reset-container">
      <div className="pr-reset-card">
        {/* Header */}
        <div className="pr-step-header">
          <img src={"/assets/svg/afin_admin_logo.svg"} alt="Company Logo" />
        </div>

        {/* Steps */}
        <div className="pr-steps-container">
          <AnimatePresence mode="wait">
            {/* Step 1: Create New Password */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pr-step"
              >
                <div className="pr-step-title">
                  <h2>Reset Your Password</h2>
                  <p>Create a new secure password for your account</p>
                </div>

                <form onSubmit={handlePasswordContinue} className="pr-form">
                  {passwordErrors.general && (
                    <div className="pr-error-banner">
                      <CircleAlert size={16} color="#cf4141" />
                      {passwordErrors.general}
                    </div>
                  )}

                  <div className="pr-form-group">
                    <label className="pr-form-label">New Password</label>
                    <div className="pr-password-input">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`pr-form-input ${
                          passwordErrors.password ? "pr-error" : ""
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
                        placeholder="Enter your new password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="pr-password-toggle"
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
                      <span className="pr-error-text">
                        {passwordErrors.password}
                      </span>
                    )}
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-form-label">
                      Confirm New Password
                    </label>
                    <div className="pr-password-input">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className={`pr-form-input ${
                          passwordErrors.confirmPassword ? "pr-error" : ""
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
                        placeholder="Confirm your new password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="pr-password-toggle"
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
                      <span className="pr-error-text">
                        {passwordErrors.confirmPassword}
                      </span>
                    )}
                  </div>

                  <div className="pr-password-requirements">
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
                    className="pr-continue-btn"
                    disabled={isLoading}
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Verify with TOTP */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pr-step"
              >
                <div className="pr-step-title">
                  <div className="pr-shield-icon">
                    <ShieldCheck size={48} color="#3b82f6" />
                  </div>
                  <h2>Verify Your Identity</h2>
                  <p>Enter the 6-digit code from your authenticator app</p>
                </div>

                <form onSubmit={handlePasswordReset} className="pr-totp-form">
                  <div className="pr-form-group">
                    <label className="pr-form-label pr-totp-label">
                      <Info size={20} />
                      <div>
                        Authentication Code
                        <span>Open your Google Authenticator app</span>
                      </div>
                    </label>
                    <input
                      type="text"
                      className={`pr-form-input pr-totp-input ${
                        totpError ? "pr-error" : ""
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
                      autoFocus
                    />
                    {totpError && (
                      <span className="pr-error-text">{totpError}</span>
                    )}
                  </div>

                  <div className="pr-form-actions">
                    <button
                      type="button"
                      className="pr-back-btn"
                      onClick={() => {
                        setCurrentStep(1);
                        setTotpCode("");
                        setTotpError("");
                      }}
                      disabled={isLoading}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                    <button
                      type="submit"
                      className="pr-reset-btn"
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
                          className="pr-loading-spinner"
                        />
                      )}
                      {isLoading ? "Resetting..." : "Reset Password"}
                    </button>
                  </div>
                </form>
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
                className="pr-step pr-success-step"
              >
                <div className="pr-success-content">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="pr-success-icon"
                  >
                    ✅
                  </motion.div>

                  <h2>Password Reset Successful!</h2>
                  <p>
                    Your password has been successfully updated. You can now
                    login with your new password.
                  </p>

                  {userData.name && (
                    <div className="pr-user-info">
                      <p>
                        <strong>Name:</strong> {userData.name}
                      </p>
                      <p>
                        <strong>Email:</strong> {userData.email}
                      </p>
                    </div>
                  )}

                  <button
                    className="pr-login-btn"
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
        <div className="pr-footer">
          <p>
            Need help? Contact{" "}
            <a href="mailto:info@afinadvisory.com">info@afinadvisory.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// Loading fallback component
const PasswordResetFallback = () => (
  <div className="pr-reset-container">
    <div className="pr-reset-card">
      <div className="pr-step-header">
        <img src={"/assets/svg/afin_admin_logo.svg"} alt="Company Logo" />
      </div>
      <div className="pr-steps-container">
        <div className="pr-loading-container">
          <div className="pr-loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    </div>
  </div>
);

// Main component wrapped with Suspense
const Page = () => {
  return (
    <Suspense fallback={<PasswordResetFallback />}>
      <PasswordResetContent />
    </Suspense>
  );
};

export default Page;
