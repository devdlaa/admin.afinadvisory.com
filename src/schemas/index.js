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

// ============================================================================
// Structured Export Object
// ============================================================================

export const schemas = Object.freeze({
  // Core
  entity: {
    create: EntityCreateSchema,
    update: EntityUpdateSchema,
    query: EntityQuerySchema,
    bulkImport : EntityBulkImportSchema,
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
});

// Zod validation schema for UUID
export const uuidSchema = z.string().uuid("Invalid category ID format");

export const enums = {
  entity: schemas.entity.enums,
  task: schemas.task.enums,
};
