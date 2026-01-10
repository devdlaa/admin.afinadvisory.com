"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Info, LogIn } from "lucide-react";
import "./login.scss";

const LoginContent = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const isDevelopment = process.env === "development";

  const turnstileRef = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});

  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");

  useEffect(() => {
    setIsMounted(true);
    if (isDevelopment) {
      setTurnstileToken("dev-bypass-token");
    }
  }, [isDevelopment]);

  useEffect(() => {
    if (!isMounted || isDevelopment) return;

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.onload = () => setTurnstileLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [isMounted, isDevelopment]);

  useEffect(() => {
    if (isDevelopment) return;

    if (turnstileLoaded && window.turnstile && turnstileRef.current) {
      window.turnstile.render(turnstileRef.current, {
        sitekey: process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        "error-callback": () => setTurnstileToken(""),
        "expired-callback": () => setTurnstileToken(""),
        theme: "light",
        size: "normal",
      });
    }
  }, [turnstileLoaded, isDevelopment]);

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

    if (isMounted && !isDevelopment && !turnstileToken) {
      errors.turnstile = "Please complete the security verification";
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // STEP 1: Verify email and password only
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (!validateLogin()) return;

    setIsLoading(true);
    setLoginErrors({});

    try {
      // Verify Turnstile (skip in dev)
      if (!isDevelopment) {
        const turnstileResponse = await fetch("/api/verify-turnstile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: turnstileToken }),
        });

        const turnstileResult = await turnstileResponse.json();

        if (!turnstileResult.success) {
          setLoginErrors({
            general: "Security verification failed. Please try again.",
          });
          if (window.turnstile) {
            window.turnstile.reset();
          }
          setTurnstileToken("");
          setIsLoading(false);
          return;
        }
      }

      // Call our verification API
      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      });

      const verifyResult = await verifyResponse.json();

     

      if (!verifyResult.success) {
        setLoginErrors({ general: verifyResult.error });
        if (!isDevelopment && window.turnstile) {
          window.turnstile.reset();
          setTurnstileToken("");
        }
        setIsLoading(false);
        return;
      }

      // Credentials are valid
      if (verifyResult.requires2FA) {
        // User has 2FA enabled - move to step 2
        setCurrentStep(2);
      } else {
        // No 2FA - directly login with NextAuth
        const result = await signIn("credentials", {
          email: loginData.email,
          password: loginData.password,
          redirect: false,
        });

        if (result?.ok) {
          window.location.href = "/dashboard";
        } else {
          setLoginErrors({
            general: "Login failed. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginErrors({
        general: "An unexpected error occurred. Please try again.",
      });

      if (!isDevelopment && window.turnstile) {
        window.turnstile.reset();
        setTurnstileToken("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify TOTP and login with NextAuth
  const handleTotpSubmit = async (e) => {
    e.preventDefault();

    if (!totpCode || totpCode.length !== 6) {
      setTotpError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setTotpError("");

    try {
      // Login with NextAuth - send email, password AND TOTP
      const result = await signIn("credentials", {
        email: loginData.email,
        password: loginData.password,
        totpCode: totpCode,
        redirect: false,
      });

  

      if (result?.ok) {
        // Success - redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        // Failed - invalid TOTP code
        setTotpError("Invalid verification code. Please try again.");
        setTotpCode("");
      }
    } catch (error) {
      console.error("TOTP verification error:", error);
      setTotpError("An unexpected error occurred. Please try again.");
      setTotpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setCurrentStep(1);
    setTotpCode("");
    setTotpError("");

    if (!isDevelopment && window.turnstile) {
      window.turnstile.reset();
      setTurnstileToken("");
    } else if (isDevelopment) {
      setTurnstileToken("dev-bypass-token");
    }
  };

  const stepStyle = {
    opacity: 1,
    transform: "translateX(0)",
    transition: "all 0.3s ease-in-out",
  };

  return (
    <div className="lg-login-container">
      <div className="lg-login-card">
        <div className="lg-step-header">
          <img
            src="/assets/svg/afin_admin_logo.svg"
            alt="AFINTHRIVE ADVISORY ADMIN LOGIN"
          />
        </div>

        {isDevelopment && (
          <div className="lg-dev-notice">
            <Info size={16} />
            Development Mode - Security verification disabled
          </div>
        )}

        <div className="lg-steps-container">
          {/* STEP 1: Email + Password */}
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

                {isMounted && !isDevelopment && (
                  <div className="lg-form-group">
                    <div
                      ref={turnstileRef}
                      className="lg-turnstile-container"
                    ></div>
                    {loginErrors.turnstile && (
                      <span className="lg-error-text">
                        {loginErrors.turnstile}
                      </span>
                    )}
                  </div>
                )}

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

          {/* STEP 2: 2FA Verification */}
          {currentStep === 2 && (
            <div className="lg-step" style={stepStyle}>
              <div className="lg-step-title">
                <h2>Two-Factor Authentication</h2>
                <p>Enter the 6-digit code from your authenticator app</p>
              </div>

              <div className="lg-2fa-verify">
                {totpError && (
                  <div className="lg-error-banner">{totpError}</div>
                )}

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
                      autoFocus
                    />
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

        <div className="lg-footer">
          <p>
            Need help? Contact{" "}
            <a href="mailto:info@afinadvisory.com">info@afinadvisory.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

const LoginPageFallback = () => {
  return (
    <div className="lg-login-container">
      <div className="lg-login-card">
        <div className="lg-step-header">
          <img
            src="/assets/svg/afin_admin_logo.svg"
            alt="AFINTHRIVE ADVISORY ADMIN LOGIN"
          />
        </div>
        <div className="lg-steps-container">
          <div className="lg-step">
            <div className="lg-step-title">
              <h2>Loading...</h2>
              <p>Please wait while we prepare your login page</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;
