"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchBookings,
  resetState,
  setQuickViewData,
  clearQuickViewData,
} from "@/store/slices/servicesSlice";

import "./service_bookings.scss";
import GenericActionBar from "@/app/components/GenericActionBar/GenericActionBar";
import GenericFilterDialog from "@/app/components/GenericFilterDialog/GenericFilterDialog";

import {
  servicesActionBarConfig,
  servicesFilterConfig,
} from "@/config/actionBarConfig";

import ServiceBookingsCards from "@/app/components/ServiceBookings/ServiceBookingsCards";
import ServiceBookingQuickView from "@/app/components/ServiceBookingQuickView/ServiceBookingQuickView";
import AssignmentDialog from "@/app/components/AssignmentDialog/AssignmentDialog";

export default function Home() {
  const dispatch = useDispatch();
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");
  const [isAssignmentBoxActive, setAssignmentBox] = useState(null);

  // Ref to prevent multiple fetches
  const fetchInProgressRef = useRef(false);

  // Redux selectors
  const quickViewData = useSelector((state) => state.services.quickViewData);
  const { loading, bookings, initialized } = useSelector(
    (state) => state.services
  );

  // Memoized handlers to prevent unnecessary re-renders
  const handleFilterClick = useCallback(() => {
    setFilterMode("filter");
    setShowFilterDialog(true);
  }, []);

  const handleExportClick = useCallback(() => {
    setFilterMode("export");
    setShowFilterDialog(true);
  }, []);

  const handleQuickView = useCallback(
    (booking) => {
      dispatch(setQuickViewData(booking));
    },
    [dispatch]
  );

  const handleCloseQuickView = useCallback(() => {
    dispatch(clearQuickViewData());
  }, [dispatch]);

  const handleCloseFilterDialog = useCallback(() => {
    setShowFilterDialog(false);
  }, []);

  const handleViewFullDetails = useCallback((booking) => {
    alert(`View full details for: ${booking.service_booking_id}`);
  }, []);

  // Initial data fetch - only if not initialized
  useEffect(() => {
    const shouldFetch = !initialized && !loading && !fetchInProgressRef.current;

    if (shouldFetch) {
      fetchInProgressRef.current = true;
      dispatch(fetchBookings({ cursor: null })).finally(() => {
        fetchInProgressRef.current = false;
      });
    }
  }, [dispatch, initialized, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fetchInProgressRef.current = false;
    };
  }, []);

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "1500px",
        margin: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      <AssignmentDialog
        isOpen={isAssignmentBoxActive}
        isBookingSub={true}
        onClose={() => setAssignmentBox(null)}
      />
      {/* Action Bar */}
      <GenericActionBar
        {...servicesActionBarConfig}
        onFilterClick={handleFilterClick}
        onExport={handleExportClick}
      />

      {/* Bookings Table */}
      <ServiceBookingsCards
        onQuickView={handleQuickView}
        onAssignTeam={(e) => {
          setAssignmentBox(e);
        }}
      />

      {/* Filter Dialog */}
      <GenericFilterDialog
        {...servicesFilterConfig}
        isOpen={showFilterDialog}
        onClose={handleCloseFilterDialog}
        mode={filterMode}
      />

      {/* Quick View Dialog */}
      <ServiceBookingQuickView
        bookingData={quickViewData}
        isOpen={!!quickViewData}
        onClose={handleCloseQuickView}
        onViewFullDetails={handleViewFullDetails}
      />
    </div>
  );
}
