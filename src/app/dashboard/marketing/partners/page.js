"use client";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import "./InfluencerDashboard.scss";

import InfluencerTable from "@/app/components/partners/InfluencerTable/InfluencerTable";
import InfluencerDrawer from "@/app/components/partners/InfluencerDrawer/InfluencerDrawer";
import AddInfluencerDialog from "@/app/components/partners/AddInfluencerDialog/AddInfluencerDialog";
import GenericActionBar from "@/app/components/GenericActionBar/GenericActionBar";
import GenericFilterDialog from "@/app/components/GenericFilterDialog/GenericFilterDialog";

import {
  influencersActionBarConfig,
  influencersFilterConfig,
} from "@/config/actionBarConfig";

import { fetchInfluencers } from "@/store/slices/influencersSlice";


const InfluencerDashboard = () => {
  const dispatch = useDispatch();

  const [isAddInfluencerDialogOpen, setAddInfluencerDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");

  // Load initial influencers on component mount
  useEffect(() => {
    dispatch(fetchInfluencers({ cursor: null }));
  }, [dispatch]);

  const handleFilterClick = () => {
    setFilterMode("filter");
    setShowFilterDialog(true);
  };

  const handleExportClick = () => {
    setFilterMode("export");
    setShowFilterDialog(true);
  };

  const handleAddNewInfluencer = () => {
    setAddInfluencerDialog(true);
  };

  return (
    <div className="influencer-dashboard">
      <div className="dashboard-content">
        {/* Add Influencer Dialog */}
        <AddInfluencerDialog
          isOpen={isAddInfluencerDialogOpen}
          onClose={() => setAddInfluencerDialog(false)}
        />

        {/* Influencer Drawer */}
        <InfluencerDrawer />

        {/* Generic Action Bar */}
        <GenericActionBar
          {...influencersActionBarConfig}
          onFilterClick={handleFilterClick}
          onExport={handleExportClick}
          onAddNew={handleAddNewInfluencer}
        />

        {/* Influencer Table */}
        <InfluencerTable  />

        {/* Generic Filter Dialog */}
        <GenericFilterDialog
          {...influencersFilterConfig}
          isOpen={showFilterDialog}
          onClose={() => setShowFilterDialog(false)}
          mode={filterMode}
        />
      </div>
    </div>
  );
};

export default InfluencerDashboard;
