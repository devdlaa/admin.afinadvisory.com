import { z } from "zod";
import {
  EntityCreateSchema,
  EntityUpdateSchema,
  EntityQuerySchema,
  EntityTypeEnum,
  EntityStatusEnum,
  EntityBulkImportSchema,
} from "./core/entity.schema.js";

import {
  AdminUserCreateSchema,
  AdminUserIdSchema,
  AdminUserListSchema,
  AdminUserLoginSchema,
  AdminUserSearchSchema,
  AdminUserUpdateSchema,
} from "./core/adminUser.schema.js";

import {
  createTaskSchema as TaskCreateSchema,
  TaskUpdateSchema,
  TaskStatusEnum,
  TaskPriorityEnum,
  listTasksSchema,
  TaskBulkStatusUpdateSchema,
  TaskBulkPriorityUpdateSchema,
  taskSearchQuerySchema,
} from "./operations/task.schema.js";

import {
  TaskAssignmentTaskIdSchema,
  TaskAssignmentSyncSchema,
  BulkAssignTaskSchema,
} from "./operations/taskAssignment.schema.js";

import {
  bulkChargeStatusUpdateSchema,
  bulkTaskChargeUpdateSchema,
  createTaskChargeSchema,
  deleteTaskChargeSchema,
  hardDeleteTaskChargeSchema,
  listTaskChargesSchema,
  restoreTaskChargeSchema,
  updateTaskChargeSchema,
} from "./core/taskCharge.schema.js";
import {
  taskCategoryCreateSchema,
  taskCategoryIdSchema,
  taskCategoryUpdateSchema,
} from "./core/taskCategory.schema.js";
import {
  taskCommentCreateSchema,
  taskCommentListQuerySchema,
  TaskCommentQuerySchema,
  taskCommentUpdateSchema,
} from "./activity/taskComment.schema.js";
import { checklistSyncSchema } from "./core/taskChecklist.js";
import {
  bulkMarkNonBillableSchema,
  bulkRestoreBillableSchema,
  nonBillableReconcileQuerySchema,
  OutstandingEntityBreakdownSchema,
  OutstandingQuerySchema,
  reconciledReconcileQuerySchema,
  unreconciledReconcileQuerySchema,
} from "./operations/reconcile.schema.js";
import {
  createEntityAdhocChargeSchema,
  updateEntityAdhocChargeSchema,
  deleteEntityAdhocChargeSchema,
} from "./core/entityCharge.schema.js";
import {
  documentDeleteSchema,
  documentListQuerySchema,
  DocumentScopeEnum,
  documentUploadSchema,
  renameDocumentSchema,
} from "./operations/document.schema.js";
import {
  bulkInvoiceActionSchema,
  InvoiceCancelSchema,
  InvoiceCreateOrAppendSchema,
  InvoiceGetDetailsSchema,
  InvoiceQuerySchema,
  InvoiceUnlinkTasksSchema,
  InvoiceUpdateInfoSchema,
  InvoiceUpdateStatusSchema,
} from "./operations/invoice.schema.js";
import {
  CompanyProfileCreateSchema,
  CompanyProfileQuerySchema,
  CompanyProfileUpdateSchema,
} from "./operations/Companyprofile.schema.js";

import {
  PermissionCreateSchema,
  PermissionUpdateSchema,
  PermissionBulkUpdateSchema,
  PermissionDeleteSchema,
  PermissionListSchema,
} from "./core/permission.schema.js";
import {
  createReminderTagSchema,
  updateReminderTagSchema,
  deleteReminderTagSchema,
  reminderTagIdSchema,
} from "./core/reminderTag.schema.js";

import {
  createReminderListSchema,
  updateReminderListSchema,
  deleteReminderListSchema,
  listReminderListsQuerySchema,
  reminderListIdSchema,
} from "./core/reminderList.schema.js";
import {
  createReminderSchema,
  updateReminderSchema,
  reminderLifecycleSchema,
  listReminderWeekBoardsSchema,
  checkAliveSchema,
  getMyDaySchema,
} from "./core/reminder.schema.js";

// ============================================================================
// Structured Export Object
// ============================================================================

export const schemas = Object.freeze({
  // Core
  entity: {
    create: EntityCreateSchema,
    update: EntityUpdateSchema,
    query: EntityQuerySchema,
    bulkImport: EntityBulkImportSchema,
    enums: {
      type: EntityTypeEnum,
      status: EntityStatusEnum,
    },
  },

  adminUser: {
    create: AdminUserCreateSchema,
    update: AdminUserUpdateSchema,
    list: AdminUserListSchema,
    search: AdminUserSearchSchema,
    user_id: AdminUserIdSchema,
    login: AdminUserLoginSchema,
  },

  task: {
    create: TaskCreateSchema,
    update: TaskUpdateSchema,
    query: listTasksSchema,
    search: taskSearchQuerySchema,
    bulkStatus: TaskBulkStatusUpdateSchema,
    bulkPriority: TaskBulkPriorityUpdateSchema,
    enums: {
      status: TaskStatusEnum,
      priority: TaskPriorityEnum,
    },
  },

  taskCharge: {
    create: createTaskChargeSchema,
    update: updateTaskChargeSchema,
    delete: deleteTaskChargeSchema,
    list: listTaskChargesSchema,
    restore: restoreTaskChargeSchema,
    hardDelete: hardDeleteTaskChargeSchema,
    bulkStatus: bulkChargeStatusUpdateSchema,
    bulkTaskChargeUpdate: bulkTaskChargeUpdateSchema,
  },

  taskAssignment: {
    taskId: TaskAssignmentTaskIdSchema,
    sync: TaskAssignmentSyncSchema,
    bulk: BulkAssignTaskSchema,
  },
  taskCategory: {
    create: taskCategoryCreateSchema,
    update: taskCategoryUpdateSchema,
    id: taskCategoryIdSchema,
  },
  taskComment: {
    create: taskCommentCreateSchema,
    update: taskCommentUpdateSchema,
    query: TaskCommentQuerySchema,
  },
  taskChecklist: {
    sync: checklistSyncSchema,
  },
  reconcile: {
    unreconciled: unreconciledReconcileQuerySchema,
    reconciled: reconciledReconcileQuerySchema,
    nonBillable: nonBillableReconcileQuerySchema,
    markNonBillable: bulkMarkNonBillableSchema,
    restoreBillable: bulkRestoreBillableSchema,
  },
  outstanding: {
    query: OutstandingQuerySchema,
    entityBreakdown: OutstandingEntityBreakdownSchema,
  },
  entityAdhocCharge: {
    create: createEntityAdhocChargeSchema,
    update: updateEntityAdhocChargeSchema,
    delete: deleteEntityAdhocChargeSchema,
  },
  document: {
    upload: documentUploadSchema,
    query: documentListQuerySchema,
    delete: documentDeleteSchema,
    rename: renameDocumentSchema,
    enums: {
      scope: DocumentScopeEnum,
    },
  },
  invoice: {
    createOrAppend: InvoiceCreateOrAppendSchema,
    query: InvoiceQuerySchema,
    getDetails: InvoiceGetDetailsSchema,
    updateInfo: InvoiceUpdateInfoSchema,
    updateStatus: InvoiceUpdateStatusSchema,
    unlinkTasks: InvoiceUnlinkTasksSchema,
    cancel: InvoiceCancelSchema,
    bulkAction: bulkInvoiceActionSchema,
  },
  companyProfile: {
    update: CompanyProfileUpdateSchema,
    query: CompanyProfileQuerySchema,
    create: CompanyProfileCreateSchema,
  },
  permission: {
    create: PermissionCreateSchema,
    update: PermissionUpdateSchema,
    bulkUpdate: PermissionBulkUpdateSchema,
    delete: PermissionDeleteSchema,
    list: PermissionListSchema,
  },
  reminder: {
    create: createReminderSchema,
    update: updateReminderSchema,
    lifecycle: reminderLifecycleSchema,
    weekBoards: listReminderWeekBoardsSchema,
    myDay: getMyDaySchema,
    checkAlive: checkAliveSchema,
  },
  reminderTag: {
    create: createReminderTagSchema,
    update: updateReminderTagSchema,
    delete: deleteReminderTagSchema,
    id: reminderTagIdSchema,
  },
  reminderList: {
    create: createReminderListSchema,
    update: updateReminderListSchema,
    delete: deleteReminderListSchema,
    query: listReminderListsQuerySchema,
    id: reminderListIdSchema,
  },
});

// Zod validation schema for UUID
export const uuidSchema = z.string().uuid("Invalid category ID format");

export const enums = {
  entity: schemas.entity.enums,
  task: schemas.task.enums,
};
