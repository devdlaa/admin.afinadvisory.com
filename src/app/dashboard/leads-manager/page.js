"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import styles from "./page.module.scss";

import PipelineDrawer from "./components/Pipelinedrawer/Pipelinedrawer";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import InfluencerDialog from "./influncers/components/InfluencerDialog/InfluencerDialog";
import LeadContactDialog from "./leads-contact/components/LeadContactDialog/LeadContactDialog";

import LeadTagsDialog from "./components/LeadTagsDialog/LeadTagsDialog";
import KanbanBoard from "./components/KanbanBoard/KanbanBoard";
import DeleteStageDialog from "./components/DeleteStageDialog/DeleteStageDialog";
import LeadDetailsDrawer from "./components/LeadDetailsDrawer/LeadDetailsDrawer";
import CreateLeadDrawer from "./components/CreateLeadDrawer/CreateLeadDrawer";
import {
  fetchPipelineLeads,
  selectStageCursor,
  selectStageHasMore,
  selectStageItems,
  syncPipelineStages,
} from "@/store/slices/leadsSlice";

import {
  fetchLeadPipelines,
  fetchAndSetActivePipeline,
  deleteLeadPipeline,
  updateLeadPipeline,
  selectPipelineList,
  selectPipelineLoading,
  selectPipelinePagination,
  selectCurrentPipeline,
  selectActivePipelineStages,
  selectActivePipelineLoading,
  deleteLeadPipelineStage,
} from "@/store/slices/leadPipelinesSlice";

import {
  fetchCompanyProfiles,
  selectListProfiles,
  selectDefaultProfileFromCache,
  selectIsLoading as selectCompanyLoading,
} from "@/store/slices/companyProfileSlice";

const PAGE_SIZE = 20;

export default function LeadsManagerPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const pipelines = useSelector(selectPipelineList);
  const pipelinesLoading = useSelector(selectPipelineLoading);
  const pagination = useSelector(selectPipelinePagination);
  const activePipeline = useSelector(selectCurrentPipeline);
  const activePipelineStages = useSelector(selectActivePipelineStages);
  const activePipelineLoading = useSelector(selectActivePipelineLoading);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedLeadStageId, setSelectedLeadStageId] = useState(null);
  const [navigationState, setNavigationState] = useState(null);

  const companies = useSelector(selectListProfiles);
  const leads = useSelector((state) =>
    selectedLeadStageId
      ? selectStageItems(activePipeline.id, selectedLeadStageId)(state)
      : [],
  );

  const hasMore = useSelector((state) =>
    selectedLeadStageId
      ? selectStageHasMore(activePipeline.id, selectedLeadStageId)(state)
      : false,
  );

  const cursor = useSelector((state) =>
    selectedLeadStageId
      ? selectStageCursor(activePipeline.id, selectedLeadStageId)(state)
      : null,
  );
  const currentIndex = leads.findIndex((l) => l.id === selectedLeadId);
  const hasNext =
    currentIndex !== -1 && (currentIndex < leads.length - 1 || hasMore);

  const hasPrev = currentIndex > 0;
  const defaultCompany = useSelector(selectDefaultProfileFromCache);
  const companiesLoading = useSelector((state) =>
    selectCompanyLoading(state, "list"),
  );

  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [createLeadStage, setCreateLeadStage] = useState(null);

  const searchTimeoutRef = useRef(null);
  const initialSelectionDoneRef = useRef(false);
  const prevPipelineIdRef = useRef(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPipelineId, setDrawerPipelineId] = useState(null);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    pipeline: null,
  });
  const [defaultDialog, setDefaultDialog] = useState({
    open: false,
    pipeline: null,
  });

  // ── Delete stage dialog ─────────────────────────────────────
  const [deleteStageDialog, setDeleteStageDialog] = useState({
    open: false,
    stage: null,
  });

  const [influencerOpen, setInfluencerOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const activePipelineId = activePipeline?.id ?? null;
  const stageCount = activePipelineStages.length;

  useEffect(() => {
    dispatch(fetchCompanyProfiles({ page: 1, page_size: 10 }));
  }, [dispatch]);

  useEffect(() => {
    if (!companies.length || selectedCompanyId) return;
    const target = defaultCompany ?? companies[0];
    if (target) setSelectedCompanyId(target.id);
  }, [companies, defaultCompany]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    dispatch(
      fetchLeadPipelines({
        page: 1,
        page_size: PAGE_SIZE,
        company_profile_id: selectedCompanyId,
      }),
    );
  }, [selectedCompanyId, dispatch]);

  useEffect(() => {
    const leadId = searchParams.get("leadId");

    if (!leadId) return;

    if (selectedLeadId === leadId) return;

    setSelectedLeadId(leadId);
  }, [searchParams]);

  useEffect(() => {
    if (!pipelines.length || initialSelectionDoneRef.current) return;

    const urlId = searchParams.get("pipeline_id");
    const target = pipelines.find((p) => p.is_default) ?? pipelines[0];

    if (urlId) {
      if (activePipeline?.id !== urlId) {
        dispatch(fetchAndSetActivePipeline(urlId));
      }
    } else {
      if (activePipeline?.id !== target.id) {
        dispatch(fetchAndSetActivePipeline(target.id));
      }
      const params = new URLSearchParams(window.location.search);
      params.set("pipeline_id", target.id);
      router.replace(`?${params.toString()}`);
    }

    initialSelectionDoneRef.current = true;
  }, [pipelines.length]);

  useEffect(() => {
    if (!stageCount) return;
    setSelectedStage((prev) => {
      const first = activePipelineStages[0]?.name;
      if (!first) return prev;
      const stillValid = activePipelineStages.some((s) => s.name === prev);
      return stillValid ? prev : first;
    });
  }, [activePipelineId, stageCount]);

  useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

  useEffect(() => {
    if (!activePipelineId || !activePipelineStages.length) return;

    dispatch(
      syncPipelineStages({
        pipelineId: activePipelineId,
        stages: activePipelineStages,
      }),
    );
  }, [activePipelineId, activePipelineStages, dispatch]);

  // Layour observer
  useEffect(() => {
    if (!activePipelineStages.length) return;

    if (prevPipelineIdRef.current === activePipelineId) return;
    prevPipelineIdRef.current = activePipelineId;

    setLayoutReady(false);
    const raf = requestAnimationFrame(() => {
      setLayoutReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [activePipelineId, activePipelineStages.length]);

  const handleToggleSidebar = useCallback(
    () => setSidebarHidden((p) => !p),
    [],
  );

  const handleSelectPipeline = useCallback(
    (p) => {
      dispatch(fetchAndSetActivePipeline(p.id));
      const params = new URLSearchParams(window.location.search);
      params.set("pipeline_id", p.id);
      router.replace(`?${params.toString()}`);
    },
    [dispatch, router],
  );

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !pagination.has_more) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    await dispatch(
      fetchLeadPipelines({ page: nextPage, page_size: PAGE_SIZE }),
    );
    setCurrentPage(nextPage);
    setLoadingMore(false);
  }, [dispatch, currentPage, loadingMore, pagination.has_more]);

  const handleCreatePipeline = useCallback(() => {
    setDrawerPipelineId(null);
    setDrawerOpen(true);
  }, []);

  const handleUpdatePipeline = useCallback((p) => {
    setDrawerPipelineId(p.id);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(
    (savedResult) => {
      setDrawerOpen(false);
      setDrawerPipelineId(null);
      if (!savedResult) return;
      dispatch(
        fetchLeadPipelines({ page: 1, page_size: PAGE_SIZE * currentPage }),
      );
      const newId =
        typeof savedResult === "string"
          ? savedResult
          : (savedResult?.id ?? savedResult?.pipeline?.id ?? null);
      if (newId) {
        dispatch(fetchAndSetActivePipeline(newId));
        const params = new URLSearchParams(window.location.search);
        params.set("pipeline_id", newId);
        router.replace(`?${params.toString()}`);
      } else if (activePipeline?.id) {
        dispatch(fetchAndSetActivePipeline(activePipeline.id));
      }
    },
    [dispatch, currentPage, activePipeline, router],
  );

  const handleDeletePipeline = useCallback((p) => {
    setDeleteDialog({ open: true, pipeline: p });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const p = deleteDialog.pipeline;
    if (!p) return;
    const res = await dispatch(deleteLeadPipeline(p.id));
    setDeleteDialog({ open: false, pipeline: null });
    if (!res.error && activePipeline?.id === p.id) {
      const remaining = pipelines.filter((x) => x.id !== p.id);
      const next = remaining[0] ?? null;
      if (next) {
        dispatch(fetchAndSetActivePipeline(next.id));
        const params = new URLSearchParams(window.location.search);
        params.set("pipeline_id", next.id);
        router.replace(`?${params.toString()}`);
      }
    }
  }, [deleteDialog.pipeline, dispatch, pipelines, activePipeline, router]);

  const handleMarkDefault = useCallback((p) => {
    if (p.is_default) return;
    setDefaultDialog({ open: true, pipeline: p });
  }, []);

  const handleConfirmMarkDefault = useCallback(async () => {
    const p = defaultDialog.pipeline;
    if (!p) return;
    await dispatch(updateLeadPipeline({ id: p.id, is_default: true }));
    setDefaultDialog({ open: false, pipeline: null });
  }, [defaultDialog.pipeline, dispatch]);

  const handleSearch = useCallback((q) => {
    setIsSearching(true);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setIsSearching(false), 700);
  }, []);

  const handleStageChange = useCallback((s) => setSelectedStage(s), []);

  // ── KanbanBoard handlers ────────────────────────────────────

  const handleCreateLead = useCallback((stage) => {
    setCreateLeadStage(stage);
  }, []);

  // Move stage left or right — optimistic in KanbanBoard, API call here
  const handleMoveStage = useCallback(
    async (stageId, direction) => {
      if (!activePipeline?.id) return;

      // Work from the current Redux order (source of truth for the API payload)
      const openStages = activePipelineStages
        .filter((s) => !s.is_closed)
        .sort((a, b) => a.stage_order - b.stage_order);

      const idx = openStages.findIndex((s) => s.id === stageId);
      if (idx === -1) return;
      const targetIdx = direction === "left" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= openStages.length) return;

      // Swap
      const reordered = [...openStages];
      [reordered[idx], reordered[targetIdx]] = [
        reordered[targetIdx],
        reordered[idx],
      ];

      // Send id + name for each stage in the new order.
      // The server assigns stage_order = array index + 1.
      const stagesPayload = reordered.map((s) => ({ id: s.id, name: s.name }));

      try {
        await dispatch(
          updateLeadPipeline({
            id: activePipeline.id,
            stages: stagesPayload,
          }),
        ).unwrap();
        // updateLeadPipeline.fulfilled already sets state.current.data to the full
        // returned pipeline — KanbanBoard's sync useEffect will reconcile quietly.
      } catch {
        // API failed — re-fetch to snap back to server order (triggers KanbanBoard rollback)
        dispatch(fetchAndSetActivePipeline(activePipeline.id));
      }
    },
    [dispatch, activePipeline, activePipelineStages],
  );

  // Open delete-stage confirmation dialog
  const handleDeleteStage = useCallback(
    (stageId) => {
      const stage = activePipelineStages.find((s) => s.id === stageId);
      if (!stage || stage.is_closed) return;
      setDeleteStageDialog({ open: true, stage });
    },
    [activePipelineStages],
  );

  // Confirmed delete stage — remove from pipeline via updateLeadPipeline
  const handleConfirmDeleteStage = useCallback(
    async ({ migrate_to_stage_id, migrate_to_new_stage_name }) => {
      const stage = deleteStageDialog.stage;
      if (!stage || !activePipeline?.id) return;

      await dispatch(
        deleteLeadPipelineStage({
          pipelineId: activePipeline.id,
          stageId: stage.id,
          ...(migrate_to_stage_id && { migrate_to_stage_id }),
          ...(migrate_to_new_stage_name && { migrate_to_new_stage_name }),
        }),
      ).unwrap();

      setDeleteStageDialog({ open: false, stage: null });
    },
    [deleteStageDialog.stage, activePipeline, dispatch],
  );

  const handleNewDeal = useCallback(() => alert("Create new deal"), []);
  const handleManageTags = useCallback(() => setTagsOpen(true), []);
  const handleNewInfluencer = useCallback(() => setInfluencerOpen(true), []);
  const handleInfluencerClose = useCallback(() => setInfluencerOpen(false), []);
  const handleNewContact = useCallback(() => setContactOpen(true), []);
  const handleContactClose = useCallback(() => setContactOpen(false), []);
  const handleContactSuccess = useCallback(() => setContactOpen(false), []);

  const handleNextLead = useCallback(async () => {
    if (currentIndex === -1) return;

    if (currentIndex < leads.length - 1) {
      setSelectedLeadId(leads[currentIndex + 1].id);
      return;
    }

    if (!hasMore || !cursor) return;

    try {
      setNavigationState("next");

      await dispatch(
        fetchPipelineLeads({
          pipelineId: activePipelineId,
          stageIds: [selectedLeadStageId],
          cursor: btoa(JSON.stringify({ [selectedLeadStageId]: cursor })),
        }),
      );
    } finally {
      setNavigationState(null);
    }
  }, [
    currentIndex,
    leads,
    hasMore,
    cursor,
    dispatch,
    activePipelineId,
    selectedLeadStageId,
  ]);

  const handlePrevLead = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedLeadId(leads[currentIndex - 1].id);
    }
  }, [currentIndex, leads]);

  const handleRefreshLeads = async () => {
    if (!activePipelineId) return;

    try {
      const pipeline = await dispatch(
        fetchAndSetActivePipeline(activePipelineId),
      ).unwrap();

      // 2. Refresh all stages leads
      const stageIds = pipeline?.stages?.map((s) => s.id) || [];

      if (stageIds.length) {
        await dispatch(
          fetchPipelineLeads({
            pipelineId: activePipelineId,
            stageIds,
            cursor: null,
          }),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLead = (leadId, stageId) => {
    setSelectedLeadId(leadId);
    setSelectedLeadStageId(stageId);
    const params = new URLSearchParams(window.location.search);
    params.set("leadId", leadId);

    router.replace(`?${params.toString()}`);
  };

  const handleCloseDrawer = () => {
    setSelectedLeadId(null);
    setSelectedLeadStageId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("leadId");
    params.delete("tab");
    router.replace(`?${params.toString()}`);
  };

  const stageOptions = activePipelineStages.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className={styles.layout}>
      <Sidebar
        hidden={sidebarHidden}
        pipelines={pipelines}
        totalCount={pagination.total_items ?? pipelines.length}
        selectedPipeline={activePipeline}
        hasMore={pagination.has_more}
        loading={pipelinesLoading && currentPage === 1}
        loadingMore={loadingMore}
        onSelectPipeline={handleSelectPipeline}
        onCreatePipeline={handleCreatePipeline}
        onUpdatePipeline={handleUpdatePipeline}
        onDeletePipeline={handleDeletePipeline}
        onMarkDefault={handleMarkDefault}
        onLoadMore={handleLoadMore}
      />

      <div className={styles.mainArea}>
        <TopBar
          stages={stageOptions}
          selectedStage={selectedStage}
          stagesLoading={activePipelineLoading}
          sidebarHidden={sidebarHidden}
          onToggleSidebar={handleToggleSidebar}
          onStageChange={handleStageChange}
          onSearch={handleSearch}
          isSearching={isSearching}
          onNewDeal={handleNewDeal}
          onManageTags={handleManageTags}
          onRefreshKanbanBoard={handleRefreshLeads}
          onNewInfluencer={handleNewInfluencer}
          onNewContact={handleNewContact}
          onAddPipeline={handleCreatePipeline}
          companies={companies}
          selectedCompanyId={selectedCompanyId}
          selectedPiplineId={activePipelineId}
          companiesLoading={companiesLoading}
          onCompanyChange={setSelectedCompanyId}
        />
        <div className={styles.content}>
          <KanbanBoard
            key={activePipelineId}
            stages={activePipelineStages}
            onMoveStage={handleMoveStage}
            onCreateLead={handleCreateLead}
            onDeleteStage={handleDeleteStage}
            layoutReady={layoutReady}
            pipelineId={activePipelineId}
            onLeadClick={handleOpenLead}
          />
        </div>
      </div>

      {/* ── Pipeline dialogs ── */}
      <PipelineDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        pipelineId={drawerPipelineId}
      />

      <ConfirmationDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, pipeline: null })}
        actionName={`Delete pipeline "${deleteDialog.pipeline?.name}"?`}
        actionInfo="This action is permanent. All stages in this pipeline will be removed. Pipelines with existing leads cannot be deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isCritical
        criticalConfirmWord="DELETE"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialog({ open: false, pipeline: null })}
      />

      <ConfirmationDialog
        isOpen={defaultDialog.open}
        onClose={() => setDefaultDialog({ open: false, pipeline: null })}
        actionName={`Set "${defaultDialog.pipeline?.name}" as the default pipeline?`}
        actionInfo="The current default pipeline will be unset. New leads will use this pipeline by default."
        confirmText="Set as Default"
        cancelText="Cancel"
        variant="default"
        onConfirm={handleConfirmMarkDefault}
        onCancel={() => setDefaultDialog({ open: false, pipeline: null })}
      />

      {/* ── Delete stage dialog ── */}
      <DeleteStageDialog
        open={deleteStageDialog.open}
        onClose={() => setDeleteStageDialog({ open: false, stage: null })}
        onConfirm={handleConfirmDeleteStage}
        stageToDelete={deleteStageDialog.stage}
        existingStages={activePipelineStages.filter(
          (s) => s.id !== deleteStageDialog.stage?.id,
        )}
      />
      <InfluencerDialog
        open={influencerOpen}
        onClose={handleInfluencerClose}
        influencerId={null}
      />

      <CreateLeadDrawer
        open={!!createLeadStage}
        onClose={() => setCreateLeadStage(null)}
        pipeline={activePipeline}
        onSuccess={() => setCreateLeadStage(null)}
      />

      <LeadContactDialog
        isOpen={contactOpen}
        mode="create"
        contactId={null}
        detailCacheRef={null}
        onClose={handleContactClose}
        onSuccess={handleContactSuccess}
      />

      <LeadDetailsDrawer
        LEADID={selectedLeadId}
        isOpen={!!selectedLeadId}
        onClose={handleCloseDrawer}
        onNext={handleNextLead}
        onPrev={handlePrevLead}
        hasNext={hasNext}
        hasPrev={hasPrev}
        navigationState={navigationState}
      />
      <LeadTagsDialog
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        initialMode="list"
        selectedTags={[]}
      />
    </div>
  );
}
