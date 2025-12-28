"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";

import { selectUser, selectPermissions } from "@/store/slices/sessionSlice";
import {
  selectBooking,
  selectActiveStates,
  selectLoadingStates,
} from "@/store/slices/servicesSlice";

import { tabs, DEFAULT_ACTIONS, TAB_IDS } from "@/app/constants/bookings";
import {
  matchesTabFilter,
  calculateTabCounts,
  sortBookings,
} from "@/utils/client/ui/bookingFilters";

import BookingCard from "./BookingCard";
import TabsBar from "./TabsBar";

import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";

import BookingSkeletonList from "./BookingCardSkeleton";

import "./ServiceBookingsCards.scss";

const ITEMS_PER_PAGE = 25;

const ServiceBookingsCards = ({
  onQuickView,
  onAssignTeam,
  actionButtons = [],
}) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const permissions = useSelector(selectPermissions);
  const user = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState(TAB_IDS.ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Redux state
  const bookings = useSelector((state) => state.services.bookings);
  const searchedBookings = useSelector(
    (state) => state.services.searchedBookings
  );
  const {
    loading: l_loading,
    searchLoading,
    exportLoading,
  } = useSelector(selectLoadingStates);
  const { isSearchActive } = useSelector(selectActiveStates);

  const loading = l_loading || searchLoading || exportLoading;

  // Filter tabs based on permissions
  const filteredTabs = useMemo(() => {
    return tabs.filter((tab) => {
      const hasPermission =
        !tab.permissions ||
        tab.permissions.some((perm) => permissions.includes(perm));
      const hasRole = !tab.roles || tab.roles.includes(user?.role);
      return hasPermission && hasRole;
    });
  }, [tabs, permissions, user]);

  // Memoize actions with callbacks
  const handleQuickView = useCallback(
    (booking) => {
      onQuickView?.(booking);
    },
    [onQuickView]
  );

  const handleEdit = useCallback(
    (booking) => {
      dispatch(selectBooking(booking.id));
      if (booking.id) {
        router.push(`/dashboard/service-bookings/${booking.id}`);
      }
    },
    [dispatch, router]
  );

  const actions = useMemo(() => {
    if (actionButtons.length > 0) return actionButtons;

    return [
      { ...DEFAULT_ACTIONS[0], onClick: handleQuickView },
      { ...DEFAULT_ACTIONS[1], onClick: handleEdit },
    ];
  }, [actionButtons, handleQuickView, handleEdit]);

  // Filtered bookings based on active tab
  const filteredBookings = useMemo(() => {
    const baseBookings = isSearchActive ? searchedBookings : bookings;
    return baseBookings.filter((booking) =>
      matchesTabFilter(booking, activeTab)
    );
  }, [bookings, searchedBookings, isSearchActive, activeTab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const baseBookings = isSearchActive ? searchedBookings : bookings;
    return calculateTabCounts(baseBookings);
  }, [bookings, searchedBookings, isSearchActive]);

  // Sorted bookings
  const sortedBookings = useMemo(() => {
    return sortBookings(filteredBookings, sortConfig);
  }, [filteredBookings, sortConfig]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return sortedBookings.slice(startIdx, endIdx);
  }, [sortedBookings, currentPage]);

  const totalPages = Math.ceil(sortedBookings.length / ITEMS_PER_PAGE);

  // Handlers
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1); // Reset to first page on tab change
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleAssignTeam = useCallback(
    (booking) => {
      onAssignTeam?.(booking);
    },
    [onAssignTeam]
  );

  return (
    <div className="service-bookings-cards">
      <TabsBar
        tabs={filteredTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabCounts={tabCounts}
      />

      <div className="cards-container">
        {loading ? (
          <BookingSkeletonList count={6} />
        ) : sortedBookings.length <= 0 ? (
          <EmptyState message="No bookings found" />
        ) : (
          <>
            <div className="cards-list">
              {paginatedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  actions={actions}
                  onAssignTeam={handleAssignTeam}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ServiceBookingsCards;
