"use client";
import { useState, useEffect } from "react";
import {
  Users,
  LogOut,
  Calendar,
  Tag,
  IndianRupee,
  Megaphone,
  TicketPercent,
  ChevronDown,
  WalletCardsIcon,
  Link,
  ShieldAlert,
  ClipboardList,
  UsersRound,
  Home,
  Briefcase,
  CheckSquare,
  Globe,
  LayoutDashboard,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { useRouter, usePathname } from "next/navigation";
import styles from "./Sidebar.module.scss";

// ============================================================================
// SIDEBAR CONFIG - Updated with nested structure
// ============================================================================
const SIDEBAR_CONFIG = {
  sections: [
    {
      id: "task-management",
      title: "Task Management",
      items: [
        {
          id: "task-home",
          label: "Dashboard",
          icon: LayoutDashboard,
          path: "/dashboard/task-managment/home",
        },
        {
          id: "task-clients",
          label: "Clients",
          icon: Briefcase,
          path: "/dashboard/task-managment/clients",
        },
        {
          id: "task-tasks",
          label: "Tasks",
          icon: CheckSquare,
          path: "/dashboard/task-managment/tasks",
        },
      ],
    },
    {
      id: "website-management",
      title: "Website Management",
      items: [
        {
          id: "website-management-dropdown",
          label: "Website",
          icon: Globe,
          path: "/dashboard/website",
          children: [
            {
              id: "customers",
              label: "Customers",
              icon: Users,
              path: "/dashboard/customers",
            },
            {
              id: "services_bookings",
              label: "Manage Bookings",
              icon: Calendar,
              path: "/dashboard/service-bookings",
            },
            {
              id: "payments",
              label: "Payments & Settlements",
              icon: IndianRupee,
              path: "/dashboard/payments",
            },
            {
              id: "payments-links",
              label: "Payment Links",
              icon: Link,
              path: "/dashboard/payment-links",
            },
            {
              id: "pricing",
              label: "Service Pricing",
              icon: Tag,
              path: "/dashboard/service-pricing",
            },
          ],
        },
      ],
    },

    {
      id: "marketing",
      title: "Marketing",
      items: [
        {
          id: "marketing-dropdown",
          label: "Marketing",
          icon: Megaphone,
          path: "/dashboard/marketing",
          children: [
            {
              id: "partners",
              label: "Brand Partners",
              icon: Megaphone,
              path: "/dashboard/marketing/partners",
            },
            {
              id: "coupons",
              label: "Coupons",
              icon: TicketPercent,
              path: "/dashboard/marketing/coupons",
            },
            {
              id: "comissions",
              label: "Commission Records",
              icon: WalletCardsIcon,
              path: "/dashboard/marketing/comissions",
            },
            {
              id: "join-list",
              label: "Influencer Join List",
              icon: ClipboardList,
              path: "/dashboard/marketing/partner-programm-join-list",
            },
          ],
        },
      ],
    },
    {
      id: "account",
      title: "Account",
      items: [
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
        },
      ],
    },
  ],
};

import { getProfileUrl } from "@/utils/shared/shared_util";



// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================
const Sidebar = () => {
  const [activeItem, setActiveItem] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const user = session?.user;
  const isSessionLoading = status === "loading";

  // Set active item based on pathname and auto-expand parent
  useEffect(() => {
    const allItems = SIDEBAR_CONFIG.sections.flatMap(
      (section) => section.items
    );

    // Flatten all items including children
    const flattenItems = (items) => {
      return items.reduce((acc, item) => {
        acc.push(item);
        if (item.children) {
          acc.push(...item.children);
        }
        return acc;
      }, []);
    };

    const allFlatItems = flattenItems(allItems);

    // Sort by path length to match most specific path first
    const sortedItems = [...allFlatItems].sort(
      (a, b) => b.path.length - a.path.length
    );

    const matchedItem = sortedItems.find(
      (item) => pathname === item.path || pathname.startsWith(item.path + "/")
    );

    if (matchedItem) {
      setActiveItem(matchedItem.id);

      // Auto-expand parent if this is a child item
      allItems.forEach((item) => {
        if (item.children?.some((child) => child.id === matchedItem.id)) {
          setExpandedItems((prev) => ({ ...prev, [item.id]: true }));
        }
      });
    }
  }, [pathname]);

  const handleSignOut = () => {
    try {
      setLoggingOut(true);
      signOut({ redirect: true, callbackUrl: "/login" });
    } catch (error) {
      setLoggingOut(false);
      console.error("Logout error:", error);
    }
  };

  const handleNavigation = (item) => {
    if (item.children?.length) {
      setExpandedItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
    } else {
      setActiveItem(item.id);
      if (item.path.startsWith("http")) {
        window.open(item.path, "_blank");
      } else {
        router.push(item.path);
      }
    }
  };

  const isActive = (item) => {
    if (activeItem === item.id) return true;
    if (item.children) {
      return item.children.some((child) => activeItem === child.id);
    }
    return false;
  };

  const renderMenuItem = (item, isChild = false) => {
    const Icon = item.icon;
    const hasChildren = item.children?.length > 0;
    const isExpanded = expandedItems[item.id];
    const active = isActive(item);

    return (
      <div key={item.id}>
        <div
          className={`${styles.menuItem} ${active ? styles.active : ""} ${
            isChild ? styles.menuItemChild : ""
          }`}
          onClick={() => handleNavigation(item)}
        >
          <div className={styles.menuItemContent}>
            {Icon && (
              <div className={styles.menuItemIconWrapper}>
                <Icon size={18} className={styles.menuItemIcon} />
              </div>
            )}
            <span className={styles.menuItemLabel}>{item.label}</span>
            {item.badge && (
              <span className={styles.menuItemBadge}>{item.badge}</span>
            )}
          </div>
          {hasChildren && (
            <ChevronDown
              size={16}
              className={`${styles.chevronIcon} ${
                isExpanded ? styles.expanded : ""
              }`}
            />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className={styles.childrenContainer}>
            {item.children.map((child) => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.sidebarContainer}>
      {/* User Profile with Skeleton Loading */}
      <div className={styles.userProfile}>
        {isSessionLoading || imageLoading ? (
          <>
            <div className={styles.userAvatarSkeleton} />
            <div className={styles.userInfo}>
              <div className={styles.userNameSkeleton} />
              <div className={styles.userEmailSkeleton} />
            </div>
            <div className={styles.chevronSkeleton} />
          </>
        ) : user ? (
          <>
            <div className={styles.userAvatar}>
              <Avatar
                src={getProfileUrl(user.id)}
                alt={user.name}
                size={32}
                fallbackText={user.name}
              />
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.name || "User"}</div>
              <div className={styles.userEmail}>{user.email || ""}</div>
            </div>
            <ChevronDown size={16} className={styles.userProfileChevron} />
          </>
        ) : null}
      </div>

      {/* Navigation */}
      <div className={styles.sidebarNavigation}>
        {SIDEBAR_CONFIG.sections.map((section) => (
          <div key={section.id} className={styles.navSection}>
            <h4 className={styles.navSectionTitle}>{section.title}</h4>
            {section.items.map((item) => renderMenuItem(item))}
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className={styles.sidebarFooter}>
        <button
          className={styles.logoutButton}
          onClick={handleSignOut}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <div className={styles.logoutSpinner} />
          ) : (
            <LogOut size={18} />
          )}
          <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
