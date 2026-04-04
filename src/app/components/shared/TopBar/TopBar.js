"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import "./TopBar.scss";
import { truncateText } from "@/utils/client/cutils";

const TopBar = () => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileDropdownOpen]);

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      setProfileDropdownOpen(false);
      
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  const handleProfileClick = () => {
    setProfileDropdownOpen(false);
    router.push("/dashboard/profile");
  };

  const handleSettingsClick = () => {
    setProfileDropdownOpen(false);
    router.push("/dashboard/settings");
  };

  // Get user info from session or provide defaults
  const getUserInfo = () => {
    if (status === "loading") {
      return {
        name: "Loading...",
        email: "Loading...",
        image: null,
        role: "Loading...",
      };
    }

    if (!session?.user) {
      return {
        name: "Guest User",
        email: "guest@example.com",
        image: null,
        role: "Guest",
      };
    }

    return {
      name: session.user.name || "Admin User",
      email: session.user.email || "admin@afinadvisory.com",
      image: session.user.image,
      role: session.user.role || "Admin",
    };
  };

  const userInfo = getUserInfo();

  // Fallback avatar image
  const getAvatarSrc = () => {
    if (userInfo.image) {
      return userInfo.image;
    }
    // Generate a placeholder avatar based on name
    const initials = userInfo.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userInfo.name
    )}&background=3b82f6&color=fff&size=40&font-size=0.6`;
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Add breadcrumb or other left content here if needed */}
      </div>

      <div className="topbar-center">
        {/* Add search or other center content here if needed */}
      </div>

      <div className="topbar-right">
        <div className="profile-container" ref={dropdownRef}>
          <div 
            className="profile-trigger" 
            onClick={toggleProfileDropdown}
            role="button"
            aria-expanded={profileDropdownOpen}
            aria-haspopup="true"
          >
            <div className="profile-avatar">
              <img
                src={getAvatarSrc()}
                alt={`${userInfo.name} Avatar`}
                className="avatar-image"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    userInfo.name
                  )}&background=3b82f6&color=fff&size=40&font-size=0.6`;
                }}
              />
              <div className={`status-indicator ${status === "authenticated" ? "online" : "offline"}`}></div>
            </div>
            <div className="profile-info">
              <span className="profile-name">{userInfo.name}</span>
              <span className="profile-role">{userInfo.role}</span>
            </div>
            <ChevronDown
              className={`profile-chevron ${profileDropdownOpen ? "open" : ""}`}
              size={16}
            />
          </div>

          {profileDropdownOpen && (
            <div className="profile-dropdown" role="menu">
              <div className="profile-dropdown-header">
                
                <div className="profile-details">
                  <h4>{userInfo.name}</h4>
                  <p>{truncateText(userInfo.email,50)}</p>
                </div>
              </div>

              <div className="profile-dropdown-menu">
         
                <button 
                  className="dropdown-item logout" 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  <span>{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;