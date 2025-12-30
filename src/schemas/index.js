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
  ResendOnboardingInviteSchema,
} from "./core/adminUser.schema.js";

import {
  RegistrationTypeCreateSchema,
  RegistrationTypeListSchema,
  RegistrationTypeUpdateSchema,
} from "./core/registrationType.schema.js";

import {
  BillableModuleCreateSchema,
  BillableModuleUpdateSchema,
  BillableModuleQuerySchema,
  BillableModuleCreateCategorySchema,
  BillableModuleListCategoriesSchema,
  BillableModuleUpdateCategorySchema,
} from "./core/billableModule.schema.js";

import {
  DepartmentCreateSchema,
  DepartmentUpdateSchema,
} from "./core/department.schema.js";

import {
  EntityGroupCreateSchema,
  EntityGroupUpdateSchema,
  EntityGroupTypeEnum,
  EntityGroupRoleEnum,
  EntityGroupMemberSyncSchema,
  EntityGroupListSchema,
} from "./core/entityGroup.schema.js";

import {
  TaskCreateSchema,
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
  TaskModuleUpdateSchema,
  TaskModuleBulkCreateSchema,
  TaskModuleDeleteSchema,
} from "./operations/taskModule.schema.js";

import {
  EntityRegistrationCreateSchema,
  EntityRegistrationUpdateSchema,
  EntityRegistrationStatusEnum,
} from "./compliance/entityRegistration.schema.js";

import {
  ComplianceRuleCreateSchema,
  ComplianceRuleListSchema,
  ComplianceRuleUpdateSchema,
  FrequencyUnitEnum,
} from "./compliance/complianceRule.schema.js";

import {
  TaskTemplateCreateSchema,
  TaskTemplateUpdateSchema,
  TaskTemplateModuleSchema,
  TaskTemplateListSchema,
} from "./compliance/taskTemplate.schema.js";

import {
  createTaskCategorySchema,
  listTaskCategoriesSchema,
  updateTaskCategorySchema,
} from "./core/taskCategory.schema.js";

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

  registrationType: {
    create: RegistrationTypeCreateSchema,
    update: RegistrationTypeUpdateSchema,
    list: RegistrationTypeListSchema,
  },

  billableModule: {
    create: BillableModuleCreateSchema,
    update: BillableModuleUpdateSchema,
    query: BillableModuleQuerySchema,
    category: {
      create: BillableModuleCreateCategorySchema,
      update: BillableModuleUpdateCategorySchema,
      list: BillableModuleListCategoriesSchema,
    },
  },

  department: {
    create: DepartmentCreateSchema,
    update: DepartmentUpdateSchema,
  },

  entityGroup: {
    create: EntityGroupCreateSchema,
    update: EntityGroupUpdateSchema,
    syncMember: EntityGroupMemberSyncSchema,
    list: EntityGroupListSchema,
    enums: {
      type: EntityGroupTypeEnum,
      role: EntityGroupRoleEnum,
    },
  },

  taskCategory: {
    create: createTaskCategorySchema,
    list: listTaskCategoriesSchema,
    update: updateTaskCategorySchema,
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

  taskAssignment: {
    taskId: TaskAssignmentTaskIdSchema,
    sync: TaskAssignmentSyncSchema,
    bulk: BulkAssignTaskSchema,
  },

  taskModule: {
    update: TaskModuleUpdateSchema,
    delete: TaskModuleDeleteSchema,
    bulkCreate: TaskModuleBulkCreateSchema,
  },

  // Compliance
  entityRegistration: {
    create: EntityRegistrationCreateSchema,
    update: EntityRegistrationUpdateSchema,
    enums: {
      status: EntityRegistrationStatusEnum,
    },
  },

  complianceRule: {
    create: ComplianceRuleCreateSchema,
    update: ComplianceRuleUpdateSchema,
    list: ComplianceRuleListSchema,
    enums: {
      frequencyUnit: FrequencyUnitEnum,
    },
  },

  taskTemplate: {
    create: TaskTemplateCreateSchema,
    update: TaskTemplateUpdateSchema,
    list: TaskTemplateListSchema,
    modules : TaskTemplateModuleSchema
  },
});

// Zod validation schema for UUID
export const uuidSchema = z.string().uuid("Invalid category ID format");

export const enums = {
  entity: schemas.entity.enums,
  task: schemas.task.enums,
};
