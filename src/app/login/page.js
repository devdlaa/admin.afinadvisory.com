"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Info, LogIn } from "lucide-react";

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import "./login.scss";

const LoginPage = () => {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 - Email and Password
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});

  // Step 2 - TOTP Verification
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");

  // Store Firebase ID token for NextAuth
  const [firebaseIdToken, setFirebaseIdToken] = useState("");

  // Handle URL error parameter on component mount
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "Configuration") {
      // User came back from failed TOTP verification
      setCurrentStep(2);
      setTotpError("Invalid verification code. Please try again.");

      // Clear the error from URL without page reload
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, "/login");
      }
    }
  }, [searchParams]);

  const validateLogin = () => {
    const errors = {};

    if (!loginData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!loginData.password) {
      errors.password = "Password is required";
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (!validateLogin()) return;

    setIsLoading(true);
    setLoginErrors({});

    try {
      // Sign in with Firebase to get ID token
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );
      console.log("userCredential", userCredential);
      // Get the ID token
      const idToken = await userCredential.user.getIdToken();
      setFirebaseIdToken(idToken);

      // Move to TOTP step
      setCurrentStep(2);
    } catch (error) {
      console.error("Firebase login error:", error);

      // Handle different Firebase error codes
      let errorMessage = "Invalid email or password. Please try again.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Contact support.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      }

      setLoginErrors({
        general: errorMessage,
      });
    } finally {
      setIsLoading(false);
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
      // Use NextAuth signIn with credentials - DON'T redirect on error
      const result = await signIn("credentials", {
        idToken: firebaseIdToken,
        totpCode: totpCode,
        redirect: false, // ✅ This prevents redirect on error
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        // Stay on step 2 and show error
        setTotpError("Invalid verification code. Please try again.");
        setTotpCode(""); // Clear the code for retry
      } else if (result?.ok) {
        // Success - redirect to dashboard
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("NextAuth login error:", error);
      setTotpError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setCurrentStep(1);
    setTotpCode("");
    setTotpError("");
    setFirebaseIdToken("");
  };

  const stepStyle = {
    opacity: 1,
    transform: "translateX(0)",
    transition: "all 0.3s ease-in-out",
  };

  return (
    <div className="lg-login-container">
      <div className="lg-login-card">
        {/* Header */}
        <div className="lg-step-header">
          <img
            src="/assets/svg/afin_admin_logo.svg"
            alt="AFINTHRIVE ADVISORY ADMIN LOGIN"
          />
        </div>

        {/* Steps */}
        <div className="lg-steps-container">
          {/* Step 1: Email and Password */}
          {currentStep === 1 && (
            <div className="lg-step" style={stepStyle}>
              <div className="lg-step-title">
                <h2>Welcome Back</h2>
                <p>Sign in to your Afinthrive Advisory account</p>
              </div>

              <div className="lg-form">
                {loginErrors.general && (
                  <div className="lg-error-banner">{loginErrors.general}</div>
                )}

                <div className="lg-form-group">
                  <label className="lg-form-label">Email Address</label>
                  <input
                    type="email"
                    className={`lg-form-input ${
                      loginErrors.email ? "lg-error" : ""
                    }`}
                    value={loginData.email}
                    onChange={(e) => {
                      setLoginData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }));
                      if (loginErrors.email || loginErrors.general) {
                        setLoginErrors((prev) => ({
                          ...prev,
                          email: "",
                          general: "",
                        }));
                      }
                    }}
                    placeholder="Enter your email address"
                    disabled={isLoading}
                  />
                  {loginErrors.email && (
                    <span className="lg-error-text">{loginErrors.email}</span>
                  )}
                </div>

                <div className="lg-form-group">
                  <label className="lg-form-label">Password</label>
                  <div className="lg-password-input">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`lg-form-input ${
                        loginErrors.password ? "lg-error" : ""
                      }`}
                      value={loginData.password}
                      onChange={(e) => {
                        setLoginData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }));
                        if (loginErrors.password || loginErrors.general) {
                          setLoginErrors((prev) => ({
                            ...prev,
                            password: "",
                            general: "",
                          }));
                        }
                      }}
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="lg-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <span className="lg-error-text">
                      {loginErrors.password}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="lg-login-btn"
                  onClick={handleLoginSubmit}
                  disabled={isLoading}
                >
                  {isLoading && <div className="lg-loading-spinner" />}
                  {isLoading ? "Signing In..." : "Sign In"}
                  {!isLoading && <LogIn size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: TOTP Verification */}
          {currentStep === 2 && (
            <div className="lg-step" style={stepStyle}>
              <div className="lg-step-title">
                <h2>Two-Factor Authentication</h2>
                <p>Please enter the verification code</p>
              </div>

              <div className="lg-2fa-verify">
                <div className="lg-totp-form">
                  <div className="lg-form-group">
                    <input
                      type="text"
                      className={`lg-form-input lg-totp-input ${
                        totpError ? "lg-error" : ""
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
                      autoComplete="one-time-code"
                    />
                    {totpError && (
                      <span className="lg-error-text">{totpError}</span>
                    )}
                  </div>

                  <div className="lg-form-actions">
                    <button
                      type="button"
                      className="lg-back-btn"
                      onClick={handleBackToLogin}
                      disabled={isLoading}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                    <button
                      type="button"
                      className="lg-verify-btn"
                      onClick={handleTotpSubmit}
                      disabled={isLoading || totpCode.length !== 6}
                    >
                      {isLoading && <div className="lg-loading-spinner" />}
                      {isLoading ? "Verifying..." : "Verify & Sign In"}
                      {!isLoading && <ArrowRight size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="lg-footer">
          <p>
            Need help? Contact{" "}
            <a href="mailto:info@afinadvisory.com">
              info@afinadvisory.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
