"use client";
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useRouter } from "next/navigation";

// Redux — task slice
import {
  updateTask,
  closeManageDialog,
  selectManageDialogOpen,
  selectManageDialogTaskId,
  updateTaskAssignmentsInList,
  deleteTask,
} from "@/store/slices/taskSlice";

// Redux — task details slice
import {
  fetchTaskById,
  syncChecklist,
  syncAssignments,
  selectCurrentTask,
  addCharge,
  updateCharge,
  deleteCharge,
  fetchDeletedCharges,
  restoreCharge,
  hardDeleteCharge,
  selectDeletedCharges,
} from "@/store/slices/taskDetailsSlice";

// Redux — categories & entity
import {
  fetchCategories,
  selectAllCategories,
} from "@/store/slices/taskCategorySlice";
import { quickSearchEntities } from "@/store/slices/entitySlice";

// Utils
import { toDateInputValue } from "@/utils/shared/shared_util";

// ─────────────────────────────────────────────
const CRITICAL_STATUS = ["ON_HOLD", "PENDING_CLIENT_INPUT", "CANCELLED"];

const EMPTY_PRIMARY_INFO = {
  title: "",
  description: "",
  priority: "NORMAL",
  status: "PENDING",
  task_category_id: null,
  entity_id: null,
  start_date: "",
  due_date: "",
  end_date: "",
};

// ─────────────────────────────────────────────
export function useTaskManageDrawer() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Selectors ──────────────────────────────
  const isOpen = useSelector(selectManageDialogOpen);
  const taskId = useSelector(selectManageDialogTaskId);
  const task = useSelector(selectCurrentTask);
  const deletedCharges = useSelector(selectDeletedCharges);
  const categories = useSelector(selectAllCategories);

  // Loading states
  const isLoading = useSelector((state) => state.taskDetail.loading.task);
  const isUpdating = useSelector((state) => state.task.loading.update);
  const isDeleting = useSelector((state) => state.task.loading.delete);
  const taskError = useSelector((state) => state.taskDetail.error.task);
  const isSyncingChecklist = useSelector(
    (state) => state.taskDetail.loading.checklist,
  );
  const isLoadingCharges = useSelector(
    (state) => state.taskDetail.loading.charges,
  );
  const isLoadingDeletedCharges = useSelector(
    (state) => state.taskDetail.loading.deletedCharges,
  );
  const isSavingAssignments = useSelector(
    (state) => state.taskDetail.loading.assignments,
  );
  const chargeOperations = useSelector(
    (state) => state.taskDetail.loading.chargeOperations || {},
  );

  // ── Refs ───────────────────────────────────
  const drawerRef = useRef(null);
  const isClosingRef = useRef(false);
  const addClientDialogRef = useRef(null);

  // ── UI state ───────────────────────────────
  const [activeTab, setActiveTab] = useState("checklist");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // ── Status-reason state ────────────────────
  const [needsReason, setNeedsReason] = useState(false);
  const [reasonContext, setReasonContext] = useState(null);
  const [showStatusReasonDialog, setShowStatusReasonDialog] = useState(false);

  // ── Primary info state ─────────────────────
  const [primaryInfo, setPrimaryInfo] = useState(EMPTY_PRIMARY_INFO);
  const [originalPrimaryInfo, setOriginalPrimaryInfo] = useState(null);

  // ── Entity / client state ──────────────────
  const [selectedEntityData, setSelectedEntityData] = useState(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [tempSelectedEntity, setTempSelectedEntity] = useState(null);

  // ── Assignment dialog state ────────────────
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

  // ─────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────

  // Fetch task & categories when drawer opens
  useEffect(() => {
    if (isOpen && taskId) {
      dispatch(fetchTaskById(taskId));
      dispatch(fetchCategories({ page: 1, page_size: 100 }));
      isClosingRef.current = false;
    }
  }, [isOpen, taskId, dispatch]);

  // Sync form state when task data arrives
  useEffect(() => {
    if (!task) return;

    const taskData = {
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "NORMAL",
      status: task.status || "PENDING",
      task_category_id: task.task_category_id || null,
      entity_id: task.entity_id || null,
      start_date: task.start_date ? toDateInputValue(task.start_date) : "",
      due_date: task.due_date ? toDateInputValue(task.due_date) : "",
      end_date: task.end_date ? toDateInputValue(task.end_date) : "",
    };

    setPrimaryInfo(taskData);
    setOriginalPrimaryInfo(taskData);
    setSelectedEntityData(task.entity ?? null);
  }, [task]);

  // Flag when status changes to a critical value
  useEffect(() => {
    if (!originalPrimaryInfo) return;
    if (
      primaryInfo.status !== originalPrimaryInfo.status &&
      CRITICAL_STATUS.includes(primaryInfo.status)
    ) {
      setNeedsReason(true);
      setReasonContext(primaryInfo.status);
    }
  }, [primaryInfo.status, originalPrimaryInfo]);

  // Sync active tab from URL
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (isOpen && urlTab) setActiveTab(urlTab);
  }, [searchParams, isOpen]);

  // Debounced entity search
  useEffect(() => {
    if (!searchQuery?.trim()) {
      setEntitySearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingEntities(true);
      try {
        const result = await dispatch(
          quickSearchEntities({ search: searchQuery, limit: 20 }),
        ).unwrap();
        setEntitySearchResults(result.data || []);
      } catch {
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  const hasPrimaryInfoChanges = () => {
    if (!originalPrimaryInfo) return false;
    return JSON.stringify(primaryInfo) !== JSON.stringify(originalPrimaryInfo);
  };

  const getOverdueDays = () => {
    if (!task?.due_date) return 0;
    const due = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // ─────────────────────────────────────────────
  // Handlers — navigation & drawer lifecycle
  // ─────────────────────────────────────────────

  const setTab = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleClose = (force = false) => {
    if (isClosingRef.current) return;

    const isForced = force === true;

    if (!isForced && needsReason) {
      setShowStatusReasonDialog(true);
      return;
    }

    if (!isForced && hasPrimaryInfoChanges()) {
      setShowConfirmClose(true);
      return;
    }

    isClosingRef.current = true;
    dispatch(closeManageDialog());
    window.__closingTaskDrawer = true;

    // Reset local state
    setActiveTab("checklist");
    setSelectedEntityData(null);
    setNeedsReason(false);
    setReasonContext(null);

    // Clean URL
    const params = new URLSearchParams(window.location.search);
    params.delete("taskId");
    params.delete("tab");
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    if (isClosingRef.current || isDeleting) return;
    handleClose();
  };

  // ─────────────────────────────────────────────
  // Handlers — primary info
  // ─────────────────────────────────────────────

  const handlePrimaryInfoChange = (field, value) => {
    setPrimaryInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePrimaryInfo = async () => {
    try {
      await dispatch(
        updateTask({
          taskId: task.id,
          data: {
            ...primaryInfo,
            start_date: primaryInfo.start_date || null,
            due_date: primaryInfo.due_date || null,
          },
        }),
      ).unwrap();
      setOriginalPrimaryInfo({ ...primaryInfo });
    } catch {
      /* handled upstream */
    }
  };

  // ─────────────────────────────────────────────
  // Handlers — entity / client
  // ─────────────────────────────────────────────

  const handleSelectEntity = (entity) => setTempSelectedEntity(entity);

  const handleClearEntitySelection = () =>
    setTempSelectedEntity({ id: null, __cleared: true });

  const handleCloseClientDialog = () => {
    setShowClientDialog(false);
    setSearchQuery("");
    setEntitySearchResults([]);
    setTempSelectedEntity(null);
  };

  const handleConfirmEntitySelection = async () => {
    if (!tempSelectedEntity) {
      handleCloseClientDialog();
      return;
    }

    const isCleared = tempSelectedEntity.__cleared === true;
    const isChanged = tempSelectedEntity.id !== task?.entity_id;

    if (!isCleared && !isChanged) {
      handleCloseClientDialog();
      return;
    }

    const nextEntityId = isCleared ? null : tempSelectedEntity.id;

    try {
      const updatedTask = await dispatch(
        updateTask({
          taskId: task.id,
          data: { ...primaryInfo, entity_id: nextEntityId },
        }),
      ).unwrap();

      const updatedInfo = { ...primaryInfo, entity_id: nextEntityId };
      setSelectedEntityData(updatedTask.task.entity);
      setPrimaryInfo(updatedInfo);
      setOriginalPrimaryInfo(updatedInfo);
      handleCloseClientDialog();
    } catch {
      /* handled upstream */
    }
  };

  const hasEntityChanged =
    !!tempSelectedEntity &&
    (tempSelectedEntity.__cleared === true ||
      tempSelectedEntity.id !== task?.entity_id);

  // ─────────────────────────────────────────────
  // Handlers — checklist
  // ─────────────────────────────────────────────

  const handleSaveChecklist = async (items) => {
    try {
      await dispatch(syncChecklist({ taskId: task.id, items })).unwrap();
    } catch {
      /* handled upstream */
    }
  };

  // ─────────────────────────────────────────────
  // Handlers — charges
  // ─────────────────────────────────────────────

  const handleAddCharge = async (chargeData) => {
    try {
      await dispatch(addCharge({ taskId: task.id, chargeData })).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const handleUpdateCharge = async (chargeId, chargeData) => {
    try {
      await dispatch(
        updateCharge({ taskId: task.id, chargeId, data: chargeData }),
      ).unwrap();
    } catch {
      /* handled upstream */
    }
  };

  const handleDeleteCharge = async (chargeId) => {
    try {
      await dispatch(deleteCharge({ taskId: task.id, chargeId })).unwrap();
    } catch {
      /* handled upstream */
    }
  };

  const handleRestoreCharge = async (chargeId) => {
    try {
      await dispatch(restoreCharge({ taskId: task.id, chargeId })).unwrap();
    } catch {
      /* handled upstream */
    }
  };

  const handleHardDeleteCharge = async (chargeId) => {
    try {
      await dispatch(hardDeleteCharge({ taskId: task.id, chargeId })).unwrap();
    } catch {
      /* handled upstream */
    }
  };

  const handleFetchDeletedCharges = () => {
    if (task?.id) dispatch(fetchDeletedCharges(task.id));
  };

  // ─────────────────────────────────────────────
  // Handlers — assignments
  // ─────────────────────────────────────────────

  const handleSaveAssignments = async (assignmentData) => {
    try {
      const result = await dispatch(
        syncAssignments({
          taskId: task.id,
          user_ids: assignmentData.user_ids,
          assigned_to_all: assignmentData.assigned_to_all,
        }),
      ).unwrap();
      dispatch(updateTaskAssignmentsInList(result));
      setShowAssignmentDialog(false);
    } catch {
      /* handled upstream */
    }
  };

  // ─────────────────────────────────────────────
  // Handlers — task deletion
  // ─────────────────────────────────────────────

  const handleDeleteTask = async (totpData) => {
    try {
      await dispatch(deleteTask({ taskId: task.id, ...totpData })).unwrap();
      setShowDeleteConfirm(false);
      handleClose(true);
    } catch {
      /* handled upstream */
    }
  };

  // ─────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────

  const overdueDays = getOverdueDays();
  const isActivityTab = activeTab === "task-activity";
  const isPaymentTab = activeTab === "payment";
  const isDocumentsTab = activeTab === "task-documents";

  // ─────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────

  return {
    // Selectors
    isOpen,
    task,
    categories,
    deletedCharges,

    // Loading
    isLoading,
    isUpdating,
    isDeleting,
    taskError,
    isSyncingChecklist,
    isLoadingCharges,
    isLoadingDeletedCharges,
    isSavingAssignments,
    chargeOperations,

    // Refs
    drawerRef,
    addClientDialogRef,

    // UI state
    activeTab,
    setTab,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showConfirmClose,
    setShowConfirmClose,

    // Status-reason
    needsReason,
    reasonContext,
    showStatusReasonDialog,
    setShowStatusReasonDialog,

    // Primary info
    primaryInfo,
    hasPrimaryInfoChanges,
    handlePrimaryInfoChange,
    handleSavePrimaryInfo,

    // Entity / client
    selectedEntityData,
    setSelectedEntityData,
    showClientDialog,
    setShowClientDialog,
    searchQuery,
    setSearchQuery,
    entitySearchResults,
    isSearchingEntities,
    tempSelectedEntity,
    hasEntityChanged,
    handleSelectEntity,
    handleClearEntitySelection,
    handleCloseClientDialog,
    handleConfirmEntitySelection,

    // Assignment
    showAssignmentDialog,
    setShowAssignmentDialog,
    handleSaveAssignments,

    // Checklist
    handleSaveChecklist,

    // Charges
    handleAddCharge,
    handleUpdateCharge,
    handleDeleteCharge,
    handleRestoreCharge,
    handleHardDeleteCharge,
    handleFetchDeletedCharges,

    // Task deletion
    handleDeleteTask,

    // Drawer lifecycle
    handleClose,
    handleOverlayClick,

    // Derived
    overdueDays,
    isActivityTab,
    isPaymentTab,
    isDocumentsTab,
  };
}
