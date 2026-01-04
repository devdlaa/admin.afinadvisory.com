import { z } from "zod";
import {
  EntityCreateSchema,
  EntityUpdateSchema,
  EntityQuerySchema,
  EntityTypeEnum,
  EntityStatusEnum,
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
  listTaskChargesSchema,
  updateTaskChargeSchema,
} from "./core/taskCharge.schema.js";

// ============================================================================
// Structured Export Object
// ============================================================================

export const schemas = Object.freeze({
  // Core
  entity: {
    create: EntityCreateSchema,
    update: EntityUpdateSchema,
    query: EntityQuerySchema,
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
  },

  taskAssignment: {
    taskId: TaskAssignmentTaskIdSchema,
    sync: TaskAssignmentSyncSchema,
    bulk: BulkAssignTaskSchema,
  },
});

// Zod validation schema for UUID
export const uuidSchema = z.string().uuid("Invalid category ID format");

export const enums = {
  entity: schemas.entity.enums,
  task: schemas.task.enums,
};
