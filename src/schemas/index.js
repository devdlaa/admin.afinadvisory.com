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
    bulkAction : bulkInvoiceActionSchema
  },
  companyProfile: {
    update: CompanyProfileUpdateSchema,
    query: CompanyProfileQuerySchema,
    create: CompanyProfileCreateSchema,
  },
});

// Zod validation schema for UUID
export const uuidSchema = z.string().uuid("Invalid category ID format");

export const enums = {
  entity: schemas.entity.enums,
  task: schemas.task.enums,
};
