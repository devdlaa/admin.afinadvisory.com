"use client";
import React from "react";
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
  RotateCcw,
  History,
} from "lucide-react";

// Components
import TaskTimeline from "../TaskTimeline/TaskTimeline";
import Checklist from "../Checklist/Checklist";
import ChargesManager from "../ChargesManager/ChargesManager";
import ClientAddUpdateDialog from "../../clients/components/ClientAddUpdateDialog";
import TaskStatusReasonDialog from "../TaskStatusReasonDialog/TaskStatusReasonDialog";
import AssignmentDialog from "@/app/components/pages/AssignmentDialog/AssignmentDialog";
import TaskPrimaryInfo from "../TaskPrimaryInfo";
import CreatorInfoCard from "../CreatorInfoCard";
import ClientInfoCard from "../ClientInfoCard";
import ClientSelectionDialog from "../ClientSelectionDialog";
import AssignmentInfoCard from "../AssignmentInfoCard";
import CopyButton from "@/app/components/shared/newui/CopyButton/CopyButton";
import ConfirmationDialog from "@/app/components/shared/ConfirmationDialog/ConfirmationDialog";
import DocumentManager from "@/app/components/shared/DocumentManager/DocumentManager";
import TaskDrawerSkeleton from "../TaskDrawerSkeleton/TaskDrawerSkeleton";
import TaskStatusTimeline from "../TaskStatusTimeline/TaskStatusTimeline";

import { useTaskManageDrawer } from "@/hooks/useTaskManageDrawer";

// Styles
import "./TaskManageDrawer.scss";

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const LinkedInvoiceBadge = ({ invoice }) => (
  <div
    className={`invoice-linked-badge invoice-linked-badge--${invoice.status?.toLowerCase()}`}
  >
    <div className="invoice-linked-badge__left">
      <div className="invoice-linked-badge__header">
        <span className="invoice-linked-badge__label">Linked to Invoice</span>
        <span
          className={`invoice-status-badge invoice-status-badge--${invoice.status?.toLowerCase()}`}
        >
          {invoice.status}
        </span>
      </div>
      <span className="invoice-linked-badge__number">
        {invoice.internal_number}
      </span>
    </div>

    <div className="invoice-linked-badge__actions">
      <CopyButton
        value={invoice.internal_number}
        size="sm"
        rootClass="invoice-linked-badge__copy"
      />
      <button
        className="invoice-linked-badge__view"
        onClick={() =>
          window.open(
            `/dashboard/task-managment/invoices?invoice=${invoice.internal_number}`,
            "_blank",
          )
        }
      >
        View Invoice
        <Link size={12} />
      </button>
    </div>
  </div>
);

const DeletedTaskBadge = ({ deletedAt }) => (
  <div className="task-deleted-badge">
    <div className="task-deleted-badge__left">
      <div className="task-deleted-badge__header">
        <Trash2 size={13} />
        <span className="task-deleted-badge__label">Task Deleted</span>
      </div>
      <span className="task-deleted-badge__date">
        Deleted on{" "}
        {new Date(deletedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

const TaskManageDrawer = () => {
  const {
    // Selectors
    isOpen,
    task,
    categories,
    deletedCharges,

    // Loading
    isLoading,
    isUpdating,
    isDeleting,
    isRestoring,
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
    showRestoreConfirm,
    setShowRestoreConfirm,
    handleRestoreTask,
    showConfirmClose,
    setShowConfirmClose,

    // Reason dialog — replaces the old showStatusReasonDialog / reasonContext
    reasonDialog,
    handleReasonSubmit,
    handleReasonCancel,

    // Primary info
    primaryInfo,
    hasPrimaryInfoChanges,
    handlePrimaryInfoChange,
    handleStatusChange, // ← use this for status dropdown, not handlePrimaryInfoChange
    handleSavePrimaryInfo,

    // Entity / client
    selectedEntityData,
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
  } = useTaskManageDrawer();

  if (!isOpen) return null;

  const leftPanelScrollable =
    !isActivityTab && !isPaymentTab && !isDocumentsTab;

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
        {/* Loading */}
        {isLoading && <TaskDrawerSkeleton />}

        {/* Error */}
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
            {/* ── Left Panel ── */}
            <div
              style={{
                paddingBottom: "0px",
              }}
              className={`task-drawer__left ${leftPanelScrollable ? "scrollable" : ""}`}
            >
              <TaskPrimaryInfo
                primaryInfo={primaryInfo}
                categories={categories}
                overdueDays={overdueDays}
                isActivityTab={isActivityTab}
                isPaymentTab={isPaymentTab}
                isDocumentsTab={isDocumentsTab}
                onPrimaryInfoChange={handlePrimaryInfoChange}
                onStatusChange={handleStatusChange}
              />

              {/* Tabs */}
              <div className="task-drawer__tabs">
                <button
                  className={`task-drawer__tab ${activeTab === "status-timeline" ? "active" : ""}`}
                  onClick={() => setTab("status-timeline")}
                >
                  <History size={16} />
                  <span>Status Timeline</span>
                </button>

                <button
                  className={`task-drawer__tab ${activeTab === "payment" ? "active" : ""}`}
                  onClick={() => setTab("payment")}
                >
                  <IndianRupee size={16} />
                  <span>Task Charges</span>
                </button>

                <button
                  className={`task-drawer__tab ${activeTab === "task-documents" ? "active" : ""}`}
                  onClick={() => setTab("task-documents")}
                >
                  <ArchiveRestore size={16} />
                  <span>Documents</span>
                </button>

                <button
                  className={`task-drawer__tab ${activeTab === "checklist" ? "active" : ""}`}
                  onClick={() => setTab("checklist")}
                >
                  <ListTodo size={16} />
                  <span>Checklist</span>
                </button>
                <button
                  className={`task-drawer__tab ${activeTab === "task-activity" ? "active" : ""}`}
                  onClick={() => setTab("task-activity")}
                >
                  <Rocket size={16} />
                  <span>Task Activity</span>
                </button>
              </div>

              {/* Tab Content */}
              <div
                className={`task-drawer__tab-content ${leftPanelScrollable ? "scrollable" : ""}`}
              >
                {activeTab === "status-timeline" && (
                  <TaskStatusTimeline timeline={task?.status_timeline ?? []} />
                )}

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
                    isLoading={isLoadingCharges}
                    isLoadingDeletedCharges={isLoadingDeletedCharges}
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

            {/* ── Right Panel ── */}
            <div className="task-drawer__right">
              {task?.deleted_at ? (
                <DeletedTaskBadge deletedAt={task.deleted_at} />
              ) : (
                task?.invoice && <LinkedInvoiceBadge invoice={task.invoice} />
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

              {/* Danger zone */}
              <div className="task-danger-zone">
                {task?.deleted_at ? (
                  <button
                    className="task-restore-btn"
                    disabled={isRestoring}
                    onClick={() => setShowRestoreConfirm(true)}
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} />
                        Restore Task
                      </>
                    )}
                  </button>
                ) : (
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
                )}
              </div>

              {/* Save bar — only when there are unsaved changes and reason dialog is not blocking */}
              {hasPrimaryInfoChanges() && !reasonDialog.open && (
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

      {/* ── Dialogs ── */}

      {/* Un-skippable reason dialog — shown when status changes to ON_HOLD / PENDING_CLIENT_INPUT / CANCELLED */}
      <TaskStatusReasonDialog
        isOpen={reasonDialog.open}
        status={reasonDialog.status}
        onDone={handleReasonSubmit}
        onCancel={handleReasonCancel}
      />

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        actionName="Delete this task?"
        actionInfo="This action cannot be undone. A Super Admin must authorize this."
        confirmText="Delete Task"
        isCritical={true}
        requireTotp={true}
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteTask}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmationDialog
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        actionName="Restore this task?"
        actionInfo="This will restore the task and make it active again."
        confirmText="Restore Task"
        criticalConfirmWord="RESTORE"
        isCritical={true}
        requireTotp={true}
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleRestoreTask}
        onCancel={() => setShowRestoreConfirm(false)}
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
        onAddNewClient={() => addClientDialogRef.current?.showModal()}
      />

      <ClientAddUpdateDialog
        ref={addClientDialogRef}
        mode="add"
        onCreated={() => {
          addClientDialogRef.current?.close();
          setShowClientDialog(true);
        }}
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
