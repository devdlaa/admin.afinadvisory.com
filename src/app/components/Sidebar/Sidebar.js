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
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

const Sidebar = () => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Helper function to check if user has a specific permission
  const hasPermission = (permission) => {
    if (!session?.user.permissions) return false;
    return session.user.permissions.includes(permission);
  };

  // Helper function to filter menu items based on permissions
  const filterMenuItemsByPermission = (items) => {
    return items.filter((item) => {
      // Dashboard is always accessible
      if (item.id === "dashboard") return true;

      // Check if item has a required permission
      if (item.requiredPermission) {
        return hasPermission(item.requiredPermission);
      }

      // If no specific permission required, show the item
      return true;
    });
  };

  useEffect(() => {
    // Enhanced path detection logic
    const pathToItemMap = {
      "/dashboard": "dashboard",
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

    // Special handling for dashboard - only match exact path
    if (pathname === "/dashboard") {
      matchedItemId = "dashboard";
    }

    // Fallback to dashboard if no match found
    if (!matchedItemId) {
      matchedItemId = "dashboard";
    }

    console.log("Matched item:", matchedItemId);

    setActiveItem(matchedItemId);

    // Auto-expand marketing section if any marketing child is active
    if (["partners", "coupons", "comissions"].includes(matchedItemId)) {
      setExpandedItems((prev) => ({ ...prev, marketing: true }));
    }
  }, [pathname, session?.user?.permissions]);

  function handleSignOut() {
    try {
      setLoggingOut(true);
      signOut({
        redirect: true,
        callbackUrl: "/login",
      });
    } catch (error) {
      setLoggingOut(false);
      console.error("Logout error:", error);
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

  // Define menu items with their required permissions
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/dashboard",
      badge: null,
      // Dashboard doesn't need permission check
    },
    {
      id: "customers",
      label: "Customers",
      icon: Users,
      path: "/dashboard/customers",
      badge: null,
      requiredPermission: "customers.access",
    },
    {
      id: "services_bookings",
      label: "Manage Bookings",
      icon: Calendar,
      path: "/dashboard/service-bookings",
      badge: null,
      requiredPermission: "bookings.access",
    },
    {
      id: "payments",
      label: "Payments & Settlements",
      icon: IndianRupee,
      path: "/dashboard/payments",
      badge: null,
      requiredPermission: "payments.access",
    },
    {
      id: "payments-links",
      label: "Payments Links",
      icon: Link,
      path: "/dashboard/payment-links",
      badge: null,
      requiredPermission: "bookings.create_new_link", // Using the specific permission for creating payment links
    },
    {
      id: "pricing",
      label: "Service Pricing",
      icon: Tag,
      path: "/dashboard/service-pricing",
      badge: null,
      requiredPermission: "service_pricing.access",
    },
  ];

  const marketingItems = [
    {
      id: "partners",
      label: "Brand Partners",
      icon: Megaphone,
      path: "/dashboard/marketing/partners",
      requiredPermission: "influencers.access",
    },
    {
      id: "coupons",
      label: "Coupons",
      icon: TicketPercent,
      path: "/dashboard/marketing/coupons",
      requiredPermission: "coupons.access",
    },
    {
      id: "comissions",
      label: "Comissions Records",
      icon: WalletCardsIcon,
      path: "/dashboard/marketing/comissions",
      requiredPermission: "commissions.access",
    },
  ];

  const bottomMenuItems = [
    {
      id: "blogs",
      label: "Manage Blogs",
      icon: Rss,
      path: "https://cms.afinadvisory.com/",
      // No permission required for blogs - assuming it's accessible to all
    },
    {
      id: "users",
      label: "Manage Team",
      icon: UsersRound,
      path: "/dashboard/manage-team",
      requiredPermission: "users.access",
    },
  ];

  // Filter menu items based on permissions
  const filteredMenuItems = filterMenuItemsByPermission(menuItems);
  const filteredMarketingItems = filterMenuItemsByPermission(marketingItems);
  const filteredBottomMenuItems = filterMenuItemsByPermission(bottomMenuItems);

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

  // Don't render anything if session is not loaded or doesn't have permissions
  if (!session || !session.user.permissions) {
    return (
      <div className="sidebar-container">
        <div className="sidebar_logo">
          <Image
            src={"/assets/svg/afin_admin_logo.svg"}
            alt="afinthrive advisory admin dashboard"
            width={80}
            height={60}
          />
        </div>
        <div className="loading-permissions">
          <p>Loading permissions...</p>
          {session && <p>Session loaded but no permissions found</p>}
        </div>
      </div>
    );
  }

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
        {/* Management Section - Only show if there are items to display */}
        {filteredMenuItems.length > 0 && (
          <div className="nav-section">
            <h4 className="nav-section-title">Management</h4>
            {filteredMenuItems.map((item) => renderMenuItem(item))}
          </div>
        )}

        {/* Marketing Section - Only show if there are items to display */}
        {filteredMarketingItems.length > 0 && (
          <div className="nav-section">
            <h4 className="nav-section-title">Marketing</h4>
            {filteredMarketingItems.map((item) => renderMenuItem(item))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Account Section - Only show if there are items to display */}
        {filteredBottomMenuItems.length > 0 && (
          <div className="nav-section">
            <h4 className="nav-section-title">Account</h4>
            {filteredBottomMenuItems.map((item) => renderMenuItem(item))}
          </div>
        )}

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
