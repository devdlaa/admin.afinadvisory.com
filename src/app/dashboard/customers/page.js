"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./customers.scss";

import GenericActionBar from "@/app/components/GenericActionBar/GenericActionBar";
import GenericFilterDialog from "@/app/components/GenericFilterDialog/GenericFilterDialog";
import { fetchCustomers } from "@/store/slices/customersSlice";

import {
  customersActionBarConfig,
  customersFilterConfig,
} from "@/config/actionBarConfig";

import AddUserDialog from "@/app/components/AddUserDialog/AddUserDialog";
import CustomersTable from "@/app/components/CustomersTable/CustomersTable";
import CustomerDrawer from "@/app/components/CustomerDrawer/CustomerDrawer";

export default function CustomersPage() {
  const dispatch = useDispatch();

  const [isAddUserDialogOpen, setAddUserDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");

  // Refs to prevent multiple fetches
  const initialFetchRef = useRef(false);
  const fetchPromiseRef = useRef(null);

  // Redux selectors
  const { loading, customers } = useSelector((state) => state.customers);

  // Memoized handlers to prevent unnecessary re-renders
  const handleFilterClick = useCallback(() => {
    setFilterMode("filter");
    setShowFilterDialog(true);
  }, []);

  const handleExportClick = useCallback(() => {
    setFilterMode("export");
    setShowFilterDialog(true);
  }, []);

  const handleAddNewCustomer = useCallback(() => {
    setAddUserDialog(true);
  }, []);

  const handleCloseAddUserDialog = useCallback(() => {
    setAddUserDialog(false);
  }, []);

  const handleCloseFilterDialog = useCallback(() => {
    setShowFilterDialog(false);
  }, []);

  // Initial data fetch - only once
  useEffect(() => {
    const shouldFetch =
      !initialFetchRef.current &&
      !loading &&
      customers.length === 0 &&
      !fetchPromiseRef.current;

    if (shouldFetch) {
      initialFetchRef.current = true;
      fetchPromiseRef.current = dispatch(fetchCustomers({ cursor: null }));

      // Clear the promise reference when done
      fetchPromiseRef.current.finally(() => {
        fetchPromiseRef.current = null;
      });
    }
  }, []); // Empty dependency array

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending fetch on unmount
      if (fetchPromiseRef.current) {
        fetchPromiseRef.current = null;
      }

      // Reset the initialization flag for next mount
      initialFetchRef.current = false;
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
      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onClose={handleCloseAddUserDialog}
      />

      <CustomerDrawer />

      {/* Action Bar */}
      <GenericActionBar
        {...customersActionBarConfig}
        onFilterClick={handleFilterClick}
        onExport={handleExportClick}
        onAddNew={handleAddNewCustomer}
      />

      <CustomersTable />

      {/* Filter Dialog */}
      <GenericFilterDialog
        {...customersFilterConfig}
        isOpen={showFilterDialog}
        onClose={handleCloseFilterDialog}
        mode={filterMode}
      />
    </div>
  );
}
