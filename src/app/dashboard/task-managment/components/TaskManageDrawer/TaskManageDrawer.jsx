"use client";
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Loader2,
  ListTodo,
  IndianRupee,
  Rocket,
  Save,
  Trash2,
  AlertCircle,
  ArchiveRestore,
  Link,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

// Components
import TaskTimeline from "../TaskTimeline/TaskTimeline";
import Checklist from "../Checklist/Checklist";
import ChargesManager from "../ChargesManager/ChargesManager";

import AssignmentDialog from "@/app/components/pages/AssignmentDialog/AssignmentDialog";
import TaskPrimaryInfo from "../TaskPrimaryInfo";
import CreatorInfoCard from "../CreatorInfoCard";
import ClientInfoCard from "../ClientInfoCard";
import ClientSelectionDialog from "../ClientSelectionDialog";
import AssignmentInfoCard from "../AssignmentInfoCard";
import CopyButton from "@/app/components/shared/newui/CopyButton/CopyButton";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";

import DocumentManager from "@/app/components/shared/DocumentManager/DocumentManager";

// Redux
import {
  updateTask,
  closeManageDialog,
  selectManageDialogOpen,
  selectManageDialogTaskId,
  updateTaskAssignmentsInList,
  deleteTask,
} from "@/store/slices/taskSlice";

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

import {
  fetchCategories,
  selectAllCategories,
} from "@/store/slices/taskCategorySlice";

import { quickSearchEntities } from "@/store/slices/entitySlice";

import TaskDrawerSkeleton from "../TaskDrawerSkeleton/TaskDrawerSkeleton";

// Utils
import { toDateInputValue } from "@/utils/shared/shared_util";

// Styles
import "./TaskManageDrawer.scss";

const TaskManageDrawer = () => {
  const dispatch = useDispatch();

  // Selectors
  const isOpen = useSelector(selectManageDialogOpen);
  const taskId = useSelector(selectManageDialogTaskId);
  const task = useSelector(selectCurrentTask);
  const deletedCharges = useSelector(selectDeletedCharges);
  const categories = useSelector(selectAllCategories);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTab = searchParams.get("tab");

  // Refs
  const drawerRef = useRef(null);
  const isClosingRef = useRef(false);

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

  // Local state
  const [activeTab, setActiveTab] = useState("checklist");
  const [isSavingInvoiceDetails, setIsSavingInvoiceDetails] = useState(false);

  // Primary info state
  const [primaryInfo, setPrimaryInfo] = useState({
    title: "",
    description: "",
    priority: "NORMAL",
    status: "PENDING",
    task_category_id: null,
    entity_id: null,
    start_date: "",
    due_date: "",
    end_date: "",
  });
  const [originalPrimaryInfo, setOriginalPrimaryInfo] = useState(null);

  // Entity search state
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearchingEntities, setIsSearchingEntities] = useState(false);
  const [selectedEntityData, setSelectedEntityData] = useState(null);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedEntity, setTempSelectedEntity] = useState(null);

  // Assignment Dialog
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      dispatch(fetchTaskById(taskId));
      dispatch(fetchCategories({ page: 1, page_size: 100 }));
      isClosingRef.current = false;
    }
  }, [isOpen, taskId, dispatch]);

  useEffect(() => {
    if (task) {
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

      if (task.entity) {
        setSelectedEntityData(task.entity);
      } else {
        setSelectedEntityData(null);
      }
    }
  }, [task]);

  useEffect(() => {
    if (!isOpen) return;
    if (!urlTab) return;

    setActiveTab(urlTab);
  }, [urlTab, isOpen]);

  // Entity search with debouncing
  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
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
      } catch (error) {
        setEntitySearchResults([]);
      } finally {
        setIsSearchingEntities(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  // Handlers
  const hasPrimaryInfoChanges = () => {
    if (!originalPrimaryInfo) return false;
    return JSON.stringify(primaryInfo) !== JSON.stringify(originalPrimaryInfo);
  };

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
    } catch (error) {}
  };

  const setTab = (tab) => {
    setActiveTab(tab);

    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);

    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleClose = (force = false) => {
    if (isClosingRef.current) {
      return;
    }

    const isForced = force === true;

    if (!isForced && hasPrimaryInfoChanges()) {
      setShowConfirmClose(true);
      return;
    }

    isClosingRef.current = true;

    dispatch(closeManageDialog());
    window.__closingTaskDrawer = true;
    setActiveTab("checklist");
    setSelectedEntityData(null);

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

    if (isClosingRef.current) {
      return;
    }

    if (isDeleting) {
      return;
    }

    handleClose();
  };

  // Client dialog handlers
  const handleSelectEntity = (entity) => {
    setTempSelectedEntity(entity);
  };

  const handleClearEntitySelection = () => {
    setTempSelectedEntity({ id: null, __cleared: true });
  };

  const handleConfirmEntitySelection = async () => {
    if (!tempSelectedEntity) {
      handleCloseClientDialog();
      return;
    }

    let nextEntityId = null;

    if (tempSelectedEntity.__cleared === true) {
      nextEntityId = null;
    } else if (tempSelectedEntity.id !== task?.entity_id) {
      nextEntityId = tempSelectedEntity.id;
    } else {
      handleCloseClientDialog();
      return;
    }

    try {
      const updatedTask = await dispatch(
        updateTask({
          taskId: task.id,
          data: {
            ...primaryInfo,
            entity_id: nextEntityId,
          },
        }),
      ).unwrap();

      setSelectedEntityData(updatedTask.task.entity);

      const updatedInfo = {
        ...primaryInfo,
        entity_id: nextEntityId,
      };

      setPrimaryInfo(updatedInfo);
      setOriginalPrimaryInfo(updatedInfo);

      handleCloseClientDialog();
    } catch (error) {}
  };

  const handleCloseClientDialog = () => {
    setShowClientDialog(false);
    setSearchQuery("");
    setEntitySearchResults([]);
    setTempSelectedEntity(null);
  };

  const hasEntityChanged =
    tempSelectedEntity &&
    (tempSelectedEntity.__cleared === true ||
      tempSelectedEntity.id !== task?.entity_id);

  // Checklist handlers
  const handleSaveChecklist = async (items) => {
    try {
      await dispatch(
        syncChecklist({
          taskId: task.id,
          items: items,
        }),
      ).unwrap();
    } catch (error) {}
  };

  // Charge handlers
  const handleAddCharge = async (chargeData) => {
    try {
      await dispatch(
        addCharge({
          taskId: task.id,
          chargeData,
        }),
      ).unwrap();
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleUpdateCharge = async (chargeId, chargeData) => {
    try {
      await dispatch(
        updateCharge({
          taskId: task.id,
          chargeId,
          data: chargeData,
        }),
      ).unwrap();
    } catch (error) {}
  };

  const handleDeleteCharge = async (chargeId) => {
    try {
      await dispatch(
        deleteCharge({
          taskId: task.id,
          chargeId,
        }),
      ).unwrap();
    } catch (error) {}
  };

  const handleRestoreCharge = async (chargeId) => {
    try {
      await dispatch(
        restoreCharge({
          taskId: task.id,
          chargeId,
        }),
      ).unwrap();
    } catch (error) {}
  };

  const handleHardDeleteCharge = async (chargeId) => {
    try {
      await dispatch(
        hardDeleteCharge({
          taskId: task.id,
          chargeId,
        }),
      ).unwrap();
    } catch (error) {}
  };

  const handleFetchDeletedCharges = () => {
    if (task?.id) {
      dispatch(fetchDeletedCharges(task.id));
    }
  };

  const handleSaveInvoiceDetails = async (invoiceData) => {
    setIsSavingInvoiceDetails(true);
    try {
      await dispatch(
        updateTask({
          taskId: task.id,
          data: {
            invoice_number: invoiceData.invoice_number,
            practice_firm: invoiceData.practice_firm,
          },
        }),
      ).unwrap();

      setIsSavingInvoiceDetails(false);
      return true;
    } catch (error) {
      setIsSavingInvoiceDetails(false);
      return false;
    }
  };

  // Assignment handlers
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
    } catch (error) {}
  };

  // Calculate overdue days
  const getOverdueDays = () => {
    if (!task?.due_date) return 0;
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const overdueDays = getOverdueDays();
  const isActivityTab = activeTab === "task-activity";
  const isPaymentTab = activeTab === "payment";
  const isDocumentsTab = activeTab === "task-documents";

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="task-drawer-overlay" onClick={handleOverlayClick} />

      {/* Drawer */}
      <div
        className="task-drawer"
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading State */}
        {isLoading && <TaskDrawerSkeleton />}

        {/* Error State */}
        {!isLoading && taskError && (
          <div className="task-drawer__error">
            <div className="task-drawer__error-content">
              <AlertCircle size={48} />
              <h3>Task Not Found</h3>
              <p>
                {taskError === "Task not found"
                  ? "This task may have been deleted or you don't have permission to view it."
                  : taskError}
              </p>
              <button
                className="task-drawer__error-btn"
                onClick={() => handleClose(true)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && !taskError && task && (
          <div className="task-drawer__body">
            {/* Left Panel */}
            <div
              className={`task-drawer__left ${
                !isActivityTab && !isPaymentTab && !isDocumentsTab
                  ? "scrollable"
                  : ""
              }`}
            >
              <TaskPrimaryInfo
                primaryInfo={primaryInfo}
                categories={categories}
                overdueDays={overdueDays}
                isActivityTab={isActivityTab}
                isPaymentTab={isPaymentTab}
                isDocumentsTab={isDocumentsTab}
                onPrimaryInfoChange={handlePrimaryInfoChange}
              />

              {/* Tabs */}
              <div className="task-drawer__tabs">
                <button
                  className={`task-drawer__tab ${
                    activeTab === "checklist" ? "active" : ""
                  }`}
                  onClick={() => setTab("checklist")}
                >
                  <ListTodo size={16} />
                  <span>Checklist / Sub Tasks</span>
                </button>

                <button
                  className={`task-drawer__tab ${
                    activeTab === "payment" ? "active" : ""
                  }`}
                  onClick={() => setTab("payment")}
                >
                  <IndianRupee size={16} />
                  <span>Payment & Summary</span>
                </button>

                <button
                  className={`task-drawer__tab ${
                    activeTab === "task-activity" ? "active" : ""
                  }`}
                  onClick={() => setTab("task-activity")}
                >
                  <Rocket size={16} />
                  <span>Task Activity</span>
                </button>
                <button
                  className={`task-drawer__tab ${
                    activeTab === "task-documents" ? "active" : ""
                  }`}
                  onClick={() => setTab("task-documents")}
                >
                  <ArchiveRestore size={16} />
                  <span>Documents</span>
                </button>
              </div>

              {/* Tab Content */}
              <div
                className={`task-drawer__tab-content ${
                  !isActivityTab && !isPaymentTab && !isDocumentsTab
                    ? "scrollable"
                    : ""
                }`}
              >
                {activeTab === "checklist" && (
                  <Checklist
                    initialItems={
                      task.checklist_items?.map((item) => ({
                        id: item.id,
                        text: item.title,
                        isCompleted: item.is_done,
                      })) || []
                    }
                    onSave={handleSaveChecklist}
                    isSaving={isSyncingChecklist}
                  />
                )}

                {activeTab === "payment" && (
                  <ChargesManager
                    initialCharges={task.charges || []}
                    deletedCharges={deletedCharges}
                    onAddCharge={handleAddCharge}
                    onUpdateCharge={handleUpdateCharge}
                    onDeleteCharge={handleDeleteCharge}
                    onRestoreCharge={handleRestoreCharge}
                    onHardDeleteCharge={handleHardDeleteCharge}
                    onFetchDeletedCharges={handleFetchDeletedCharges}
                    onSaveInvoiceDetails={handleSaveInvoiceDetails}
                    isLoading={isLoadingCharges}
                    isLoadingDeletedCharges={isLoadingDeletedCharges}
                    isSavingInvoiceDetails={isSavingInvoiceDetails}
                    invoiceNumber={task.invoice_number || ""}
                    practiceFirm={task.practice_firm || null}
                    chargeOperations={chargeOperations}
                  />
                )}

                {activeTab === "task-activity" && (
                  <TaskTimeline taskId={task?.id} task={task} />
                )}

                {activeTab === "task-documents" && (
                  <DocumentManager scope="TASK" scopeId={task.id} />
                )}
              </div>
            </div>

            {/* Right Panel */}
            <div className="task-drawer__right">
     
              {task?.invoice && (
                <div
                  className={`invoice-linked-badge invoice-linked-badge--${task?.invoice?.status?.toLowerCase()}`}
                >
                  <div className="invoice-linked-badge__left">
                    <div className="invoice-linked-badge__header">
                      <span className="invoice-linked-badge__label">
                        Linked to Invoice
                      </span>

              
                      <span
                        className={`invoice-status-badge invoice-status-badge--${task?.invoice?.status?.toLowerCase()}`}
                      >
                        {task.invoice.status}
                      </span>
                    </div>

                    <span className="invoice-linked-badge__number">
                      {task.invoice.internal_number}
                    </span>
                  </div>

                  <div className="invoice-linked-badge__actions">
                    <CopyButton
                      value={task.invoice.internal_number}
                      size="sm"
                      rootClass="invoice-linked-badge__copy"
                    />

                    <button
                      className="invoice-linked-badge__view"
                      onClick={() =>
                        window.open(
                          `/dashboard/task-managment/invoices?invoice=${task.invoice.internal_number}`,
                          "_blank",
                        )
                      }
                    >
                      View Invoice
                      <Link size={12}/>
                    </button>
                  </div>
                </div>
              )}

              <CreatorInfoCard task={task} />

              <AssignmentInfoCard
                task={task}
                onOpenAssignmentDialog={() => setShowAssignmentDialog(true)}
              />

              <ClientInfoCard
                selectedEntityData={selectedEntityData}
                onOpenClientDialog={() => setShowClientDialog(true)}
              />

              <div className="task-danger-zone">
                <button
                  className="task-delete-btn"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Task
                    </>
                  )}
                </button>
              </div>

              {/* Save Primary Info Button */}
              {hasPrimaryInfoChanges() && (
                <div className="task-save-bar">
                  <button
                    className="task-save-bar__btn"
                    onClick={handleSavePrimaryInfo}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 size={20} className="task-save-bar__spinner" />
                        <span>Updating Task...</span>
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        <span>Update Task Information</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        actionName="Delete this task?"
        actionInfo="This action cannot be undone."
        confirmText="Delete Task"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          try {
            await dispatch(deleteTask(task.id)).unwrap();
            setShowDeleteConfirm(false);
            handleClose(true);
          } catch (e) {}
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ClientSelectionDialog
        isOpen={showClientDialog}
        selectedEntityData={selectedEntityData}
        tempSelectedEntity={tempSelectedEntity}
        searchQuery={searchQuery}
        entitySearchResults={entitySearchResults}
        isSearchingEntities={isSearchingEntities}
        isUpdating={isUpdating}
        hasEntityChanged={hasEntityChanged}
        onClose={handleCloseClientDialog}
        onSearchChange={setSearchQuery}
        onSelectEntity={handleSelectEntity}
        onClearSelection={handleClearEntitySelection}
        onConfirmSelection={handleConfirmEntitySelection}
      />

      {showAssignmentDialog && (
        <AssignmentDialog
          isOpen={showAssignmentDialog}
          onClose={() => setShowAssignmentDialog(false)}
          hasPermission={true}
          isSaving={isSavingAssignments}
          config={{
            assignedUsers: task?.assignments?.map((a) => a.assignee) || [],
            assignedToAll: task?.assigned_to_all || false,
            creatorId: task.creator?.id,
            taskId: task.id,
            onSave: handleSaveAssignments,
            title: "Manage Task Assignments",
            subtitle: "Drag and drop team members to manage task assignments",
            maxAssignedUsers: 10,
          }}
        />
      )}

      <ConfirmationDialog
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        actionName="Discard unsaved changes?"
        actionInfo="You have unsaved changes. If you close now, they will be lost."
        confirmText="Discard changes"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={() => {
          setShowConfirmClose(false);
          handleClose(true);
        }}
        onCancel={() => setShowConfirmClose(false)}
      />
    </>
  );
};

export default TaskManageDrawer;
