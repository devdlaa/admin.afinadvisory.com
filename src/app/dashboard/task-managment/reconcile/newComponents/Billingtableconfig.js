/**
 * BILLING TABLE CONFIGURATION SYSTEM - PURE CONFIG-DRIVEN
 *
 * Zero conditionals in components. All logic lives here.
 */

// ============================================================================
// CONFIG BUILDER UTILITIES
// ============================================================================

const createControl = ({
  id,
  label,
  icon,
  variant = "default",
  handler,
  condition = () => true,
  disabled = () => false,
}) => ({
  id,
  label,
  icon,
  variant,
  handler,
  condition,
  disabled,
});

const createHeaderSection = ({ selectionInfo = null, controls = [] }) => ({
  selectionInfo,
  controls,
});

// ============================================================================
// DISPLAY CONFIGURATIONS (NEW)
// ============================================================================

const DISPLAY_CONFIGS = {
  taskBadge: {
    systemTask: {
      show: true,
      text: "AD-HOC TASK",
      className: "systemTaskBadge",
    },
    regularTask: {
      show: false,
    },
  },

  clientBadge: {
    show: true,
    text: "Partnership Firm",
    className: "clientBadge",
  },

  dateFormat: {
    locale: "en-GB",
    options: {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  },

  headerClassName: {
    default: "headerTop",
    invoiceDefault: "invoiceHeaderTop",
    invoiceWithSelection: "invoiceHeaderTop",
  },
};

// ============================================================================
// SELECTION INFO CONFIGS
// ============================================================================

const SELECTION_INFO_CONFIGS = {
  selectAll: (selectedCount, totalCount) => ({
    type: "checkbox-with-text",
    showCheckbox: true,
    checkboxProps: {
      checked: selectedCount === totalCount && totalCount > 0,
      indeterminate: selectedCount > 0 && selectedCount < totalCount,
    },
    text: selectedCount > 0 ? `${selectedCount} Selected` : "Select All",
  }),

  itemCount: (count) => ({
    type: "text-only",
    showCheckbox: false,
    text: `${count} items are linked to this invoice`,
  }),

  unlinkSelection: (selectedCount) => ({
    type: "checkbox-with-text",
    showCheckbox: true,
    checkboxProps: {
      checked: true,
    },
    text: `${selectedCount} Items Selected to be Unlinked`,
  }),
};

// ============================================================================
// EMPTY STATE CONFIGS
// ============================================================================

const EMPTY_STATE_CONFIGS = {
  default: {
    icon: "package",
    title: "No tasks found to reconcile",
    subtitle: "All the tasks have been invoiced",
  },

  invoiceLinked: {
    icon: "invoice",
    title: "This is an invoice view, and no charges are linked to this invoice",
    subtitle:
      "You have <highlight>unlinked</highlight> all the linked charges, you can either delete this invoice permanently or link more charges to mark it as issued or paid",
  },

  nonBillable: {
    icon: "package",
    title: "No non-billable tasks found",
    subtitle: "All tasks have been marked as billable",
  },
};

// ============================================================================
// CHARGES TABLE CONFIG FACTORY (CONTEXT-AWARE)
// ============================================================================

/**
 * Creates a charges table config with context-aware handlers
 * This is where we resolve which handler to use based on context
 */
const createChargesTableConfig = ({
  viewId,
  invoiceStatus = null,
  isSystemTask = false,
  handlers = {},
}) => {
  // --------------------------------------------
  // READ-ONLY LOGIC
  // --------------------------------------------
  const READ_ONLY_VIEWS = ["NON_BILLABLE"];
  const isReadOnly =
    READ_ONLY_VIEWS.includes(viewId) ||
    (viewId === "INVOICE_LINKED" && invoiceStatus !== "DRAFT");

  // --------------------------------------------
  // DELETE SEMANTICS (CONTEXT-AWARE)
  // --------------------------------------------
  // Ad-hoc tasks: Delete permanently in unreconciled/non-billable, Unlink in invoice
  // Regular charges: Always delete (remove charge from task)
  // --------------------------------------------

  let resolvedDeleteHandler = null;

  if (isSystemTask) {
    // Ad-hoc task delete behavior depends on context
    if (viewId === "INVOICE_LINKED") {
      // In invoice view: unlink the ad-hoc task from invoice
      resolvedDeleteHandler = handlers.onUnlinkSystemTask;
    } else {
      // In unreconciled/non-billable view: delete permanently
      resolvedDeleteHandler = handlers.onDeleteSystemTask;
    }
  } else {
    // Regular charges: always delete the charge
    resolvedDeleteHandler = handlers.onDeleteCharge;
  }

  // --------------------------------------------
  // RETURN CONFIG
  // --------------------------------------------
  return {
    // Permissions
    allowAdd: !isReadOnly && !isSystemTask,
    allowEdit: !isReadOnly,
    allowDelete: !isReadOnly,
    allowSelect: !isReadOnly,
    allowStatusChange: !isReadOnly,

    // Handlers (UNCHANGED CONTRACT)
    handlers: {
      onAdd: handlers.onAddCharge,
      onUpdate: handlers.onUpdateCharges,
      onDelete: resolvedDeleteHandler,
      onUpdateStatus: handlers.onUpdateChargeStatus,
      onDeleteSystemTask: handlers.onDeleteSystemTask,
      onUnlinkSystemTask: handlers.onUnlinkSystemTask,
    },

    // Empty state (unchanged)
    emptyState: {
      icon: "library",
      title: "No charges are linked to this task",
      subtitle: "Either add new charges, or mark this task as non-billable.",
      showAddButton: !isReadOnly && !isSystemTask,
    },
  };
};

// ============================================================================
// TASK ROW CONFIG FACTORY (NEW)
// ============================================================================

/**
 * Creates task row display configuration
 */
const createTaskRowConfig = ({ viewId, data }) => {
  const { task, type } = data;
  const isSystemTask = type === "ADHOC" || task.is_system;

  return {
    // Badge configuration
    badge: isSystemTask
      ? DISPLAY_CONFIGS.taskBadge.systemTask
      : DISPLAY_CONFIGS.taskBadge.regularTask,

    // Client badge configuration
    clientBadge: DISPLAY_CONFIGS.clientBadge,

    // Date format
    dateFormat: DISPLAY_CONFIGS.dateFormat,

    // System task flag
    isSystemTask,
  };
};

// ============================================================================
// MAIN TABLE CONFIGURATIONS
// ============================================================================

/**
 * NON-BILLABLE VIEW CONFIG
 */
export const createNonBillableConfig = (handlers = {}) => ({
  viewId: "NON_BILLABLE",

  emptyState: EMPTY_STATE_CONFIGS.nonBillable,

  recoverableCalculation: (charge) => charge.status === "PAID",

  showTaskSelection: true,

  display: DISPLAY_CONFIGS,

  // Task row config factory
  getTaskRowConfig: (data) =>
    createTaskRowConfig({ viewId: "NON_BILLABLE", data }),

  // Charges table config factory
  getChargesTableConfig: (data) =>
    createChargesTableConfig({
      viewId: "NON_BILLABLE",
      isSystemTask: data.type === "ADHOC" || data.task.is_system,
      handlers: {
        onAddCharge: handlers.onAddCharge,
        onUpdateCharges: handlers.onUpdateCharges,
        onDeleteCharge: handlers.onDeleteCharge,
        onUpdateChargeStatus: handlers.onUpdateChargeStatus,
        onDeleteSystemTask: handlers.onDeleteSystemTask,
        onUnlinkSystemTask: handlers.onUnlinkSystemTask,
      },
    }),

  header: {
    default: createHeaderSection({
      selectionInfo: (selectedCount, totalCount) =>
        SELECTION_INFO_CONFIGS.selectAll(selectedCount, totalCount),
      controls: [
        createControl({
          id: "expand-all",
          label: (allExpanded) =>
            allExpanded ? "Collapse All Tasks" : "Expand All Tasks",
          icon: (allExpanded) => (allExpanded ? "collapse" : "expand"),
          variant: "default",
          handler: handlers.onToggleExpandAll,
        }),
      ],
    }),

    withSelection: createHeaderSection({
      selectionInfo: (selectedCount, totalCount) =>
        SELECTION_INFO_CONFIGS.selectAll(selectedCount, totalCount),
      controls: [
        createControl({
          id: "mark-billable",
          label: "Mark as Billable",
          variant: "primary",
          handler: handlers.onMarkAsBillable,
          disabled: () => handlers.isRestoreBillableLoading,
        }),
      ],
    }),
  },

  handlers: handlers,
});

/**
 * UN-RECONCILED VIEW CONFIG
 */
export const createUnReconciledConfig = (handlers = {}) => ({
  viewId: "UN_RECONCILED",

  emptyState: EMPTY_STATE_CONFIGS.default,

  recoverableCalculation: (charge) => charge.status === "NOT_PAID",

  showTaskSelection: true,

  display: DISPLAY_CONFIGS,

  getTaskRowConfig: (data) =>
    createTaskRowConfig({ viewId: "UN_RECONCILED", data }),

  getChargesTableConfig: (data) =>
    createChargesTableConfig({
      viewId: "UN_RECONCILED",
      isSystemTask: data.type === "ADHOC" || data.task.is_system,
      handlers: {
        onAddCharge: handlers.onAddCharge,
        onUpdateCharges: handlers.onUpdateCharges,
        onDeleteCharge: handlers.onDeleteCharge,
        onUpdateChargeStatus: handlers.onUpdateChargeStatus,
        onDeleteSystemTask: handlers.onDeleteSystemTask,
        onUnlinkSystemTask: handlers.onUnlinkSystemTask,
      },
    }),

  header: {
    default: createHeaderSection({
      selectionInfo: (selectedCount, totalCount) =>
        SELECTION_INFO_CONFIGS.selectAll(selectedCount, totalCount),
      controls: [
        createControl({
          id: "expand-all",
          label: (allExpanded) =>
            allExpanded ? "Collapse All Tasks" : "Expand All Tasks",
          icon: (allExpanded) => (allExpanded ? "collapse" : "expand"),
          variant: "default",
          handler: handlers.onToggleExpandAll,
        }),
        createControl({
          id: "add-adhoc",
          label: "Add Ad-hoc Charge",
          icon: "plus",
          variant: "primary",
          handler: handlers.onAddAdHocCharge,
          disabled: () => handlers.isAddAdHocChargeLoading,
        }),
      ],
    }),

    withSelection: createHeaderSection({
      selectionInfo: (selectedCount, totalCount) =>
        SELECTION_INFO_CONFIGS.selectAll(selectedCount, totalCount),
      controls: [
        createControl({
          id: "mark-non-billable",
          label: "Mark as Non-Billable",
          variant: "secondary",
          handler: handlers.onMarkAsNonBillable,
          disabled: () => handlers.isMarkNonBillableLoading,
        }),
        createControl({
          id: "create-invoice",
          label: "Create Invoice",
          icon: "plus",
          variant: "primary",
          handler: handlers.onCreateInvoice,
          disabled: () => handlers.isMarkNonBillableLoading,
        }),
      ],
    }),
  },

  handlers: handlers,
});

/**
 * INVOICE-LINKED VIEW CONFIG
 */
export const createInvoiceLinkedConfig = (
  invoiceId,
  invoiceStatus = "DRAFT",
  handlers = {},
) => {
  const isReadOnly = invoiceStatus !== "DRAFT";

  return {
    viewId: "INVOICE_LINKED",
    invoiceId,
    invoiceStatus,

    // --------------------------------------------
    // INVOICE CAPABILITIES
    // --------------------------------------------
    capabilities: {
      isDraft: invoiceStatus === "DRAFT",

      onEmptyCharges: {
        normalTask: ["UNLINK_TASK", "MARK_NON_BILLABLE"],
        systemTask: ["UNLINK_TASK"],
      },

      onAllChargesPaid: {
        normalTask: ["UNLINK_TASK", "MARK_NON_BILLABLE"],
        systemTask: ["UNLINK_TASK", "DELETE_ADHOC_TASK"],
      },
    },

    // --------------------------------------------
    // EXISTING CONFIG (UNCHANGED)
    // --------------------------------------------
    showTaskSelection: !isReadOnly,
    emptyState: EMPTY_STATE_CONFIGS.invoiceLinked,

    recoverableCalculation: (charge) => charge.status === "NOT_PAID",

    display: DISPLAY_CONFIGS,

    getTaskRowConfig: (data) =>
      createTaskRowConfig({ viewId: "INVOICE_LINKED", data }),

    getChargesTableConfig: (data) =>
      createChargesTableConfig({
        viewId: "INVOICE_LINKED",
        invoiceStatus,
        isSystemTask: data.type === "ADHOC" || data.task.is_system,
        handlers: {
          onAddCharge: handlers.onAddCharge,
          onUpdateCharges: handlers.onUpdateCharges,
          onDeleteCharge: handlers.onDeleteCharge,
          onUpdateChargeStatus: handlers.onUpdateChargeStatus,
          onDeleteSystemTask: handlers.onDeleteSystemTask,
          onUnlinkSystemTask: handlers.onUnlinkSystemTask,
        },
      }),

    header: {
      default: createHeaderSection({
        selectionInfo: (selectedCount, totalCount) =>
          SELECTION_INFO_CONFIGS.itemCount(totalCount),
        controls: [
          createControl({
            id: "expand-all",
            label: (allExpanded) =>
              allExpanded ? "Collapse All Tasks" : "Expand All Tasks",
            icon: (allExpanded) => (allExpanded ? "collapse" : "expand"),
            variant: "default",
            handler: handlers.onToggleExpandAll,
          }),
          createControl({
            id: "link-more",
            label: "Link More Charges",
            icon: "plus",
            variant: "primary",
            handler: handlers.onLinkMoreCharges,
            disabled: () => isReadOnly,
          }),
        ],
      }),

      withSelection: createHeaderSection({
        selectionInfo: (selectedCount, totalCount) =>
          SELECTION_INFO_CONFIGS.unlinkSelection(selectedCount),
        controls: [
          createControl({
            id: "remove-selection",
            label: "Remove Selection",
            variant: "secondary",
            handler: handlers.onRemoveSelection,
          }),
          createControl({
            id: "unlink",
            label: "Un-link From Invoice",
            icon: "unlink",
            variant: "danger",
            handler: handlers.onUnlinkFromInvoice,
          }),
        ],
      }),
    },

    handlers,
  };
};

// ============================================================================
// FIELD CONFIGURATIONS FOR CHARGES TABLE
// ============================================================================

export const CHARGE_FIELD_CONFIGS = {
  title: {
    id: "title",
    label: "Charge Title",
    placeholder: "Enter charge title",
    type: "text",
    required: true,
    validation: {
      minLength: 1,
      maxLength: 200,
    },
  },

  charge_type: {
    id: "charge_type",
    label: "Charge Type",
    placeholder: "Select type",
    type: "dropdown",
    required: true,
    options: [
      { label: "Service Fee", value: "SERVICE_FEE" },
      { label: "External Charge", value: "EXTERNAL_CHARGE" },
      { label: "Goverment Fee", value: "GOVERNMENT_FEE" },
    ],
  },

  amount: {
    id: "amount",
    label: "Charge Amount",
    placeholder: "0",
    type: "number",
    required: true,
    validation: {
      regex: /^\d*\.?\d*$/,
      errorMessage: "Please enter a valid amount",
    },
  },

  status: {
    id: "status",
    label: "Payment Status",
    placeholder: "Select status",
    type: "dropdown",
    required: true,
    options: [
      {
        label: "Paid",
        value: "PAID",
        txtClr: "#34a853",
        bgColor: "#e6f4ea",
      },
      {
        label: "Not Paid Yet",
        value: "NOT_PAID",
        txtClr: "#d93025",
        bgColor: "#fce8e6",
      },
    ],
  },
};
