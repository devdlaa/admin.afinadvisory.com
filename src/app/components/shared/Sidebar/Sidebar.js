"use client";
import React, { useState, useEffect, useCallback, memo } from "react";
import {
  Users,
  LogOut,
  Calendar,
  Tag,
  IndianRupee,
  Megaphone,
  TicketPercent,
  ChevronDown,
  ShieldAlert,
  Briefcase,
  CheckSquare,
  Globe,
  ListChecks,
  FileText,
  Building,
  PanelLeftOpen,
  PanelLeftClose,
  UserPlus,
  Activity,
  Contact,
  Star,
  BarChart3,
  CalendarDays,
  Clock,
  Bell,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Avatar from "../newui/Avatar/Avatar";
import { useRouter, usePathname } from "next/navigation";
import styles from "./Sidebar.module.scss";
import { getProfileUrl } from "@/utils/shared/shared_util";

// ================= CONFIG =================
const SIDEBAR_CONFIG = {
  sections: [
    {
      id: "task-management",
      title: "Task Management",
      items: [
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
          path: "/dashboard/task-managment",
        },
        {
          id: "task-reconcile",
          label: "Reconcile",
          icon: ListChecks,
          path: "/dashboard/task-managment/reconcile",
        },
        {
          id: "task-invoices",
          label: "Invoices",
          icon: FileText,
          path: "/dashboard/task-managment/invoices",
        },
        {
          id: "task-outstandings",
          label: "Outstandings",
          icon: IndianRupee,
          path: "/dashboard/task-managment/outstanding",
        },
      ],
    },
    {
      id: "leads-management",
      title: "Leads Management",
      items: [
        {
          id: "leads",
          label: "Leads",
          icon: UserPlus,
          path: "/dashboard/leads-manager",
        },
        {
          id: "lead-activities",
          label: "Lead Activities",
          icon: Activity,
          path: "/dashboard/leads-manager/activities",
        },
        {
          id: "lead-contacts",
          label: "Lead Contacts",
          icon: Contact,
          path: "/dashboard/leads-manager/leads-contact",
        },
        {
          id: "influencers",
          label: "Influencers",
          icon: Star,
          path: "/dashboard/leads-manager/influncers",
        },
      ],
    },
    // {
    //   id: "reminders",
    //   title: "Reminders",
    //   items: [
    //     {
    //       id: "reminders",
    //       label: "Manage Reminders",
    //       icon: Bell,
    //       path: "/dashboard/reminders",
    //     },
    //   ],
    // },
    {
      id: "account",
      title: "Account",
      items: [
        {
          id: "users",
          label: "Manage Team",
          icon: ShieldAlert,
          path: "/dashboard/manage-team",
        },
        {
          id: "company",
          label: "Company Profiles",
          icon: Building,
          path: "/dashboard/company-profiles",
        },
      ],
    },
  ],
};

// ================= PRECOMPUTE =================
const ALL_TOP_LEVEL_ITEMS = SIDEBAR_CONFIG.sections.flatMap((s) => s.items);

const ALL_FLAT_ITEMS = ALL_TOP_LEVEL_ITEMS.reduce((acc, item) => {
  acc.push(item);
  if (item.children) acc.push(...item.children);
  return acc;
}, []);

const SORTED_ITEMS = [...ALL_FLAT_ITEMS].sort(
  (a, b) => b.path.length - a.path.length,
);

// ================= MENU ITEM =================
const MenuItem = memo(function MenuItem({
  item,
  isChild,
  isExpanded,
  isActive,
  expandedItems,
  handleNavigation,
}) {
  const Icon = item.icon;
  const hasChildren = item.children?.length > 0;
  const isItemExpanded = expandedItems[item.id];
  const active = isActive(item);

  if (isChild && !isExpanded) return null;

  return (
    <div>
      <div
        className={`${styles.menuItem} ${active ? styles.active : ""} ${
          isChild ? styles.menuItemChild : ""
        } ${!isExpanded ? styles.collapsed : ""}`}
        onClick={() => handleNavigation(item)}
        title={!isExpanded ? item.label : undefined}
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

        {hasChildren && isExpanded && (
          <ChevronDown
            size={16}
            className={`${styles.chevronIcon} ${
              isItemExpanded ? styles.expanded : ""
            }`}
          />
        )}
      </div>

      {hasChildren && isItemExpanded && isExpanded && (
        <div className={styles.childrenContainer}>
          {item.children.map((child) => (
            <MenuItem
              key={child.id}
              item={child}
              isChild
              isExpanded={isExpanded}
              isActive={isActive}
              expandedItems={expandedItems}
              handleNavigation={handleNavigation}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ================= SIDEBAR =================
const Sidebar = ({ isExpanded, setIsExpanded }) => {
  const [activeItem, setActiveItem] = useState("");
  const [expandedItems, setExpandedItems] = useState({});
  const [loggingOut, setLoggingOut] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const user = session?.user;
  const isSessionLoading = status === "loading";

  useEffect(() => {
    const matchedItem = SORTED_ITEMS.find(
      (item) => pathname === item.path || pathname.startsWith(item.path + "/"),
    );

    if (matchedItem && matchedItem.id !== activeItem) {
      setActiveItem(matchedItem.id);

      ALL_TOP_LEVEL_ITEMS.forEach((item) => {
        if (item.children?.some((c) => c.id === matchedItem.id)) {
          setExpandedItems((prev) => {
            if (prev[item.id]) return prev;
            return { ...prev, [item.id]: true };
          });
        }
      });
    }
  }, [pathname, activeItem]);

  const handleNavigation = useCallback(
    (item) => {
      if (item.children?.length) {
        if (!isExpanded) {
          setIsExpanded(() => true);
          setExpandedItems((prev) => ({ ...prev, [item.id]: true }));
        } else {
          setExpandedItems((prev) => ({
            ...prev,
            [item.id]: !prev[item.id],
          }));
        }
      } else {
        setActiveItem(item.id);
        router.push(item.path);
      }
    },
    [isExpanded, router, setIsExpanded],
  );

  const isActive = useCallback(
    (item) => {
      if (activeItem === item.id) return true;
      if (item.children) return item.children.some((c) => activeItem === c.id);
      return false;
    },
    [activeItem],
  );

  const handleSignOut = useCallback(() => {
    setLoggingOut(true);
    signOut({ callbackUrl: "/login" });
  }, []);

  return (
    <div
      className={`${styles.sidebarContainer} ${
        isExpanded ? styles.sidebarExpanded : styles.sidebarCollapsed
      }`}
    >
      {/* USER PROFILE + TOGGLE BUTTON */}
      <div className={styles.userProfile}>
        {isSessionLoading ? (
          <>
            {isExpanded && <div className={styles.userAvatarSkeleton} />}
            {isExpanded && (
              <div className={styles.userInfo}>
                <div className={styles.userNameSkeleton} />
                <div className={styles.userEmailSkeleton} />
              </div>
            )}
          </>
        ) : user ? (
          <>
            {isExpanded && (
              <>
                <Avatar
                  src={getProfileUrl(user.id)}
                  alt={user.name}
                  size={32}
                  fallbackText={user.name}
                />
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user.name || "User"}</div>
                  <div className={styles.userEmail}>{user.email || ""}</div>
                </div>
              </>
            )}
          </>
        ) : null}

        {/* COLLAPSE TOGGLE — moved here from footer */}
        <button
          className={styles.profileToggleButton}
          onClick={() => setIsExpanded((p) => !p)}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <PanelLeftClose size={18} />
          ) : (
            <PanelLeftOpen size={24} />
          )}
        </button>
      </div>

      {/* NAV */}
      <div className={styles.sidebarNavigation}>
        {SIDEBAR_CONFIG.sections.map((section) => (
          <div key={section.id} className={styles.navSection}>
            {isExpanded && (
              <h4 className={styles.navSectionTitle}>{section.title}</h4>
            )}
            {!isExpanded && <div className={styles.navSectionDivider} />}
            {section.items.map((item) => (
              <MenuItem
                key={item.id}
                item={item}
                isExpanded={isExpanded}
                isActive={isActive}
                expandedItems={expandedItems}
                handleNavigation={handleNavigation}
              />
            ))}
          </div>
        ))}
      </div>

      {/* FOOTER — only logout now */}
      <div className={styles.sidebarFooter}>
        <button
          className={styles.logoutButton}
          onClick={handleSignOut}
          disabled={loggingOut}
          title={!isExpanded ? "Sign Out" : undefined}
        >
          {loggingOut ? (
            <div className={styles.logoutSpinner} />
          ) : (
            <LogOut size={18} />
          )}
          {isExpanded && (
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
