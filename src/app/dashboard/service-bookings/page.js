"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchBookings,
  resetState,
  setQuickViewData,
  clearQuickViewData,
  updateAssignmentManagement,
} from "@/store/slices/servicesSlice";

import { selectPermissions } from "@/store/slices/sessionSlice";

import "./service_bookings.scss";

import GenericActionBar from "@/app/components/pages/GenericActionBar/GenericActionBar";
import GenericFilterDialog from "@/app/components/pages/GenericFilterDialog/GenericFilterDialog";
import {
  servicesActionBarConfig,
  servicesFilterConfig,
} from "@/config/actionBarConfig";


import ServiceBookingsCards from "@/app/components/pages/ServiceBookings/ServiceBookingsCards";
import ServiceBookingQuickView from "@/app/components/pages/ServiceBookingQuickView/ServiceBookingQuickView";
import AssignmentDialog from "@/app/components/pages/AssignmentDialog/AssignmentDialog";

export default function Home() {
  const dispatch = useDispatch();
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedBookingForAssignment, setSelectedBookingForAssignment] = useState(null);

  // Ref to prevent multiple fetches
  const fetchInProgressRef = useRef(false);

  // Redux selectors
  const quickViewData = useSelector((state) => state.services.quickViewData);
  const { loading, bookings, initialized } = useSelector(
    (state) => state.services
  );
  const permissions = useSelector(selectPermissions);

  // Check if user has permission to assign members
  const hasAssignPermission = permissions?.includes("bookings.assign_member");

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

  // Handle opening assignment dialog
  const handleAssignTeam = useCallback((booking) => {
    setSelectedBookingForAssignment(booking);
    setIsAssignmentDialogOpen(true);
  }, []);

  // Handle closing assignment dialog
  const handleCloseAssignmentDialog = useCallback(() => {
    setIsAssignmentDialogOpen(false);
    setSelectedBookingForAssignment(null);
  }, []);

  // Assignment dialog configuration
  const assignmentConfig = {
    selectedItem: selectedBookingForAssignment,
    apiEndpoint: "/api/admin/services/assigmnets/assign_members",
    
    buildPayload: (itemId, assignmentData) => ({
      serviceId: itemId,
      assignmentManagement: assignmentData
    }),
    
    onSuccessDispatch: (data) => {
      dispatch(updateAssignmentManagement({
        serviceId: selectedBookingForAssignment.id,
        assignmentManagement: data.assignmentManagement
      }));
    },
    
    title: "Assign Team Members to Service",
    subtitle: "Drag and drop users to manage service assignments",
    
    validateItem: (item) => {
      if (!item?.id) return "No service booking selected";
      return null;
    }
  };

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
      {/* Assignment Dialog */}
      <AssignmentDialog
        isOpen={isAssignmentDialogOpen}
        onClose={handleCloseAssignmentDialog}
        config={assignmentConfig}
        hasPermission={hasAssignPermission}
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
        onAssignTeam={handleAssignTeam}
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