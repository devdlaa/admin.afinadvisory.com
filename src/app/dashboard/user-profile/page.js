"use client";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Clock,
  Key,
  Building,
  CheckCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import "./UserProfile.scss";

const UserProfile = () => {
  const { data: session, status } = useSession();
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [copiedField, setCopiedField] = useState("");

  if (status === "loading") {
    return (
      <div className="user-profile">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-content">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="user-profile">
        <div className="error-state">
          <XCircle className="error-icon" />
          <h2>No Session Found</h2>
          <p>Please sign in to view your profile information.</p>
        </div>
      </div>
    );
  }

  const { user } = session;

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPermissions = (permissions) => {
    return permissions.map((permission) => {
      const [module, action] = permission.split(".");
      return {
        module: module.charAt(0).toUpperCase() + module.slice(1),
        action: action
          ? action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          : "",
      };
    });
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="header-content">
          <div className="user-avatar">
            <User className="avatar-icon" />
          </div>
          <div className="header-info">
            <h1 className="user-name">{user.name}</h1>
            <div className="user-meta">
              <span className={`role-badge role-${user.role}`}>
                {user.role}
              </span>
              <span className={`status-badge status-${user.status}`}>
                {user.status === "active" ? (
                  <CheckCircle className="status-icon" />
                ) : (
                  <XCircle className="status-icon" />
                )}
                {user.status}
              </span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="toggle-sensitive-btn"
            onClick={() => setShowSensitiveData(!showSensitiveData)}
          >
            {showSensitiveData ? (
              <EyeOff className="btn-icon" />
            ) : (
              <Eye className="btn-icon" />
            )}
            {showSensitiveData ? "Hide" : "Show"} Sensitive Data
          </button>
        </div>
      </div>

      <div className="profile-grid">
        {/* Basic Information */}
        <div className="info-card">
          <div className="card-header">
            <User className="card-icon" />
            <h3>Basic Information</h3>
          </div>
          <div className="card-content">
            <div className="info-row">
              <Mail className="row-icon" />
              <div className="row-content">
                <label>Email</label>
                <div className="value-with-copy">
                  <span>{user.email}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(user.email, "email")}
                  >
                    <Copy className="copy-icon" />
                    {copiedField === "email" ? "Copied!" : ""}
                  </button>
                </div>
              </div>
            </div>

            <div className="info-row">
              <Phone className="row-icon" />
              <div className="row-content">
                <label>Phone</label>
                <span>{user.phone || "Not provided"}</span>
              </div>
            </div>

            <div className="info-row">
              <Building className="row-icon" />
              <div className="row-content">
                <label>Department</label>
                <span>{user.department}</span>
              </div>
            </div>

            <div className="info-row">
              <Key className="row-icon" />
              <div className="row-content">
                <label>User Code</label>
                <div className="value-with-copy">
                  <span>{user.userCode}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(user.userCode, "userCode")}
                  >
                    <Copy className="copy-icon" />
                    {copiedField === "userCode" ? "Copied!" : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Information */}
        <div className="info-card">
          <div className="card-header">
            <Shield className="card-icon" />
            <h3>Security</h3>
          </div>
          <div className="card-content">
            <div className="info-row">
              <div className="row-content">
                <label>Two Factor Authentication</label>
                <div className="security-status">
                  {user.twoFactorEnabled ? (
                    <>
                      <CheckCircle className="security-icon enabled" />
                      <span className="enabled">Enabled</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="security-icon disabled" />
                      <span className="disabled">Disabled</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {user.totpVerifiedAt && (
              <div className="info-row">
                <Clock className="row-icon" />
                <div className="row-content">
                  <label>Last TOTP Verification</label>
                  <span>{formatDate(user.totpVerifiedAt)}</span>
                </div>
              </div>
            )}

            {showSensitiveData && (
              <>
                <div className="info-row sensitive">
                  <div className="row-content">
                    <label>User ID</label>
                    <div className="value-with-copy">
                      <span className="sensitive-value">{user.id}</span>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(user.id, "id")}
                      >
                        <Copy className="copy-icon" />
                        {copiedField === "id" ? "Copied!" : ""}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="info-row sensitive">
                  <div className="row-content">
                    <label>Firestore UID</label>
                    <div className="value-with-copy">
                      <span className="sensitive-value">
                        {user.firebaseAuthUid}
                      </span>
                      <button
                        className="copy-btn"
                        onClick={() =>
                          copyToClipboard(
                            user.firebaseAuthUid,
                            "firebaseAuthUid"
                          )
                        }
                      >
                        <Copy className="copy-icon" />
                        {copiedField === "firebaseAuthUid" ? "Copied!" : ""}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div className="info-card permissions-card">
          <div className="card-header">
            <Shield className="card-icon" />
            <h3>Permissions</h3>
            <span className="permissions-count">
              {user.permissions.length} Total Permissions
            </span>
          </div>
          <div className="card-content">
            <div className="permissions-grid">
              {formatPermissions(user.permissions).map((perm, index) => (
                <div key={index} className="permission-item">
                  <div className="permission-module">{perm.module}</div>
                  {perm.action && (
                    <div className="permission-action">{perm.action}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Address */}
        {(user.address?.line1 ||
          user.address?.city ||
          user.address?.state ||
          user.address?.pincode) && (
          <div className="info-card">
            <div className="card-header">
              <MapPin className="card-icon" />
              <h3>Address</h3>
            </div>
            <div className="card-content">
              <div className="address-content">
                {user.address.line1 && <div>{user.address.line1}</div>}
                <div>
                  {[user.address.city, user.address.state, user.address.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
