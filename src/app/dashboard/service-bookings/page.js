"use client";

import { useEffect, useState } from "react";
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

import ServiceBookingsTable from "@/app/components/ServiceBookingsTable/ServiceBookingsTable";

import ServiceBookingQuickView from "@/app/components/ServiceBookingQuickView/ServiceBookingQuickView";

export default function Home() {
  const dispatch = useDispatch();
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");


  const handleFilterClick = () => {
    setFilterMode("filter");
    setShowFilterDialog(true);
  };

  const handleExportClick = () => {
    setFilterMode("export");
    setShowFilterDialog(true);
  };

  // Redux selectors
  const quickViewData = useSelector((state) => state.services.quickViewData);

  // Load initial bookings on component mount
  useEffect(() => {
    dispatch(fetchBookings({ cursor: null }));
  }, [dispatch]);

  const handleQuickView = (booking) => {
    dispatch(setQuickViewData(booking));
  };

  const handleCloseQuickView = () => {
    dispatch(clearQuickViewData());
  };



  return (
    <>
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
        {/* Action Bar */}
        <GenericActionBar
          {...servicesActionBarConfig}
          onFilterClick={handleFilterClick}
          onExport={handleExportClick}
          
        />

        {/* Bookings Table */}
        <ServiceBookingsTable onQuickView={handleQuickView} />

        {/* Filter Dialog */}
        <GenericFilterDialog
          {...servicesFilterConfig}
          isOpen={showFilterDialog}
          onClose={() => setShowFilterDialog(false)}
          mode={filterMode}
        />
       

        {/* Quick View Dialog */}
        <ServiceBookingQuickView
          bookingData={quickViewData}
          isOpen={!!quickViewData}
          onClose={handleCloseQuickView}
          onViewFullDetails={(booking) => {
            alert(`View full details for: ${booking.service_booking_id}`);
          }}
        />
      </div>
    </>
  );
}
