"use client";
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

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

import { fetchInfluencers, clearError } from "@/store/slices/influencersSlice";

const InfluencerDashboard = () => {
  const dispatch = useDispatch();

  // Get state from Redux
  const { hasFetched, isFetching } = useSelector((state) => state.influencers);

  const [isAddInfluencerDialogOpen, setAddInfluencerDialog] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterMode, setFilterMode] = useState("filter");

  // Use ref to track if we've already initialized
  const hasInitializedRef = useRef(false);

  // Initialize data - only fetch once when component first mounts
  useEffect(() => {
    if (!hasInitializedRef.current && !hasFetched && !isFetching) {
      hasInitializedRef.current = true;
      dispatch(fetchInfluencers({ cursor: null, limit: 10, fresh: true }));
    }
  }, [dispatch, hasFetched, isFetching]);

  // Clear error on mount
  useEffect(() => {
    dispatch(clearError());
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
        <InfluencerTable />

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
