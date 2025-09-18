"use client";
import { useState, useEffect } from "react";
import "./Sidebar.scss";
import {
  Home,
  Users,
  Settings,
  ChevronDown,
  User,
  HelpCircle,
  LogOut,
  Calendar,
  Tag,
  IndianRupee,
  Megaphone,
  TicketPercent,
  ChevronLeft,
  ChevronRight,
  Shield,
  BarChart3,
  FileText,
  Bell,
  WalletCardsIcon,
  Rss,
  UsersRound,
  Link,
  ShieldAlert,
} from "lucide-react";
import { signOut } from "next-auth/react";

import Image from "next/image";
import Permission from "../Permission";
import { useRouter, usePathname } from "next/navigation";

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const router = useRouter();
  const pathname = usePathname();


  useEffect(() => {
    // Enhanced path detection logic
    const pathToItemMap = {
      "/dashboard/customers": "customers",
      "/dashboard/service-bookings": "services_bookings",
      "/dashboard/payments": "payments",
      "/dashboard/payment-links": "payments-links",
      "/dashboard/service-pricing": "pricing",
      "/dashboard/marketing/partners": "partners",
      "/dashboard/marketing/coupons": "coupons",
      "/dashboard/marketing/comissions": "comissions",
      "/dashboard/analytics": "analytics",
      "/dashboard/reports": "reports",
      "/dashboard/profile": "profile",
      "/dashboard/settings": "settings",
      "/dashboard/manage-team": "users",
      "/dashboard/user-profile": "my-profile",
    };

    // Sort paths by length (longest first) to ensure more specific paths are matched first
    const sortedPaths = Object.keys(pathToItemMap).sort(
      (a, b) => b.length - a.length
    );

    let matchedItemId = null;

    // Find the first path that matches (most specific due to sorting)
    for (const path of sortedPaths) {
      if (
        pathname === path ||
        (pathname.startsWith(path + "/") && path !== "/dashboard")
      ) {
        matchedItemId = pathToItemMap[path];
        break;
      }
    }

    // Fallback to dashboard if no match found
    if (!matchedItemId) {
      matchedItemId = "customers";
    }

    setActiveItem(matchedItemId);

    // Auto-expand marketing section if any marketing child is active
    if (["partners", "coupons", "comissions"].includes(matchedItemId)) {
      setExpandedItems((prev) => ({ ...prev, marketing: true }));
    }
  }, [pathname]);

  function handleSignOut() {
    try {
      setLoggingOut(true);
      signOut({
        redirect: true,
        callbackUrl: "/login",
      });
    } catch (error) {
      setLoggingOut(false);
      console.error("Logout error:");
    }
  }

  const toggleExpanded = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleNavigation = (item) => {
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    } else {
      setActiveItem(item.id);

      // Handle external links
      if (item.path.startsWith("http")) {
        window.open(item.path, "_blank");
      } else {
        router.push(item.path);
      }
    }
  };

  // Helper function to check if item should be active
  const isItemActive = (item) => {
    // Direct match
    if (activeItem === item.id) return true;

    // Check if any child is active (for parent items)
    if (item.children) {
      return item.children.some((child) => activeItem === child.id);
    }

    return false;
  };

  // Helper function to check if any child is active
  const hasActiveChild = (item) => {
    if (!item.children) return false;
    return item.children.some((child) => activeItem === child.id);
  };

  // Define menu items
  const menuItems = [
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      path: "/dashboard/customers",
      badge: null,
      permission: "customers.access",
    },
    {
      id: "services_bookings",
      label: "Manage Bookings",
      icon: Calendar,
      path: "/dashboard/service-bookings",
      badge: null,
      permission: "bookings.access",
    },
    {
      id: "payments",
      label: "Payments & Settlements",
      icon: IndianRupee,
      path: "/dashboard/payments",
      badge: null,
      permission: "payments.access",
    },
    {
      id: "payments-links",
      label: "Payments Links",
      icon: Link,
      path: "/dashboard/payment-links",
      badge: null,
      permission: "payment_link.access",
    },
    {
      id: "pricing",
      label: "Service Pricing",
      icon: Tag,
      path: "/dashboard/service-pricing",
      badge: null,
      permission: "service_pricing.access",
    },
  ];

  const marketingItems = [
    {
      id: "partners",
      label: "Brand Partners",
      icon: Megaphone,
      path: "/dashboard/marketing/partners",
      permission: "influencers.access",
    },
    {
      id: "coupons",
      label: "Coupons",
      icon: TicketPercent,
      path: "/dashboard/marketing/coupons",
      permission: "coupons.access",
    },
    {
      id: "comissions",
      label: "Comissions Records",
      icon: WalletCardsIcon,
      path: "/dashboard/marketing/comissions",
      permission: "commissions.access",
    },
  ];

  const bottomMenuItems = [
    {
      id: "my-profile",
      label: "My Profile",
      icon: UsersRound,
      path: "/dashboard/user-profile",
    },
    {
      id: "users",
      label: "Manage Team",
      icon: ShieldAlert,
      path: "/dashboard/manage-team",
      permission: "users.access",
    },
  ];

  const renderMenuItem = (item, isChild = false) => {
    const IconComponent = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.id];
    const isActive = isItemActive(item);
    const childActive = hasActiveChild(item);

    return (
      <div key={item.id}>
        <div
          className={`menu-item ${isActive ? "active" : ""} ${
            isChild ? "menu-item-child" : ""
          } ${hasChildren && childActive && !isActive ? "child-active" : ""}`}
          onClick={() => handleNavigation(item)}
          data-tooltip={item.label}
        >
          <div className="menu-item-content">
            {IconComponent && (
              <div className="menu-item-icon-wrapper">
                <IconComponent size={44} className="menu-item-icon" />
              </div>
            )}

            <span className="menu-item-label">{item.label}</span>
            {item.badge && (
              <span className="menu-item-badge">{item.badge}</span>
            )}
          </div>
          {hasChildren && (
            <ChevronDown
              size={16}
              className={`chevron-icon ${isExpanded ? "expanded" : ""}`}
            />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="children-container">
            {item.children.map((child) => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`sidebar-container`}>
      {/* Logo */}
      <div className="sidebar_logo">
        <Image
          src={"/assets/svg/afin_admin_logo.svg"}
          alt="afinthrive advisory admin dashboard"
          width={80}
          height={60}
        />
      </div>

      {/* Navigation */}
      <div className="sidebar-navigation">
        {/* Management Section */}
        <div className="nav-section">
          <h4 className="nav-section-title">Management</h4>
          {menuItems.map((item) => (
            <Permission
              key={item.id}
              permission={item?.permission}
              role={item?.role}
              disable={item.disable}
              fallback={null}
            >
              {renderMenuItem(item)}
            </Permission>
          ))}
        </div>

        {/* Marketing Section */}
        <div className="nav-section">
          <h4 className="nav-section-title">Marketing</h4>

          {marketingItems.map((item) => (
            <Permission
              key={item.id}
              permission={item?.permission}
              role={item?.role}
              disable={item.disable}
              fallback={null}
            >
              {renderMenuItem(item)}
            </Permission>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Account Section */}
        <div className="nav-section">
          <h4 className="nav-section-title">Account</h4>

          {bottomMenuItems.map((item) => (
            <Permission
              key={item.id}
              permission={item?.permission}
              role={item?.role}
              disable={item.disable}
              fallback={null}
            >
              {renderMenuItem(item)}
            </Permission>
          ))}
        </div>

        <div className="logout-section">
          <button
            className="logout-button"
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <div className="logout-spinner"></div>
            ) : (
              <LogOut size={18} className="logout-icon" />
            )}
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
