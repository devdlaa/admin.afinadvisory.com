"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import { fetchCustomers } from "@/store/slices/customersSlice";

import CustomersActionBar from "@/app/components/CustomersActionBar/CustomersActionBar";

import CustomersPageFilterBox from "@/app/components/CustomersPageFilterBox/CustomersPageFilterBox";
import AddUserDialog from "@/app/components/AddUserDialog/AddUserDialog";

import CustomersTable from "@/app/components/CustomersTable/CustomersTable";
import CustomerDrawer from "@/app/components/CustomerDrawer/CustomerDrawer";


export default function CustomersPage() {
  const dispatch = useDispatch();
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");
  const [isAdduserDialopOpen, setAddUserDialop] = useState(false);


  // Load initial customers on component mount
  useEffect(() => {
    dispatch(fetchCustomers({ cursor: null }));
  }, [dispatch]);

  const handleOpenFilterDialog = (mode = "filter") => {
    setFilterMode(mode);
    setIsFilterDialogOpen(true);
  };

  const handleCloseFilterDialog = () => {
    setIsFilterDialogOpen(false);
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
        <CustomersActionBar
          onFilterClick={() => handleOpenFilterDialog("filter")}
          onExport={() => handleOpenFilterDialog("export")}
          onAddNew={handleAddNewCustomer}
        />

        <CustomersTable />

        {/* Filter Dialog */}
        <CustomersPageFilterBox
          isOpen={isFilterDialogOpen}
          mode={filterMode}
          onClose={handleCloseFilterDialog}
        />
      </div>
    </>
  );
}
