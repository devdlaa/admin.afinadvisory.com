"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
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

  const [isAdduserDialopOpen, setAddUserDialop] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");

  // Load initial customers on component mount
  useEffect(() => {
    dispatch(fetchCustomers({ cursor: null }));
  }, [dispatch]);

  const handleFilterClick = () => {
    setFilterMode("filter");
    setShowFilterDialog(true);
  };

  const handleExportClick = () => {
    setFilterMode("export");
    setShowFilterDialog(true);
  };

  const handleAddNewCustomer = () => {
    setAddUserDialop(true);
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
        <AddUserDialog
          isOpen={isAdduserDialopOpen}
          onClose={() => setAddUserDialop(false)}
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
          onClose={() => setShowFilterDialog(false)}
          mode={filterMode}
        />
      </div>
    </>
  );
}
