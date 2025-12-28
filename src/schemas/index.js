import {
  EntityCreateSchema,
  EntityUpdateSchema,
  EntityQuerySchema,
  EntityTypeEnum,
  EntityStatusEnum,
} from "./core/entity.schema.js";

import {
  AdminUserCreateSchema,
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
} from "./core/billableModule.schema.js";

import {
  DepartmentCreateSchema,
  DepartmentUpdateSchema,
} from "./core/department.schema.js";

import { RoleCreateSchema, RoleUpdateSchema } from "./core/role.schema.js";

import {
  EntityGroupCreateSchema,
  EntityGroupUpdateSchema,
  EntityGroupMemberAddSchema,
  EntityGroupTypeEnum,
  EntityGroupRoleEnum,
  EntityGroupMemberListSchema,
} from "./core/entityGroup.schema.js";

import {
  TaskCreateSchema,
  TaskUpdateSchema,
  TaskQuerySchema,
  TaskStatusEnum,
  BillingStatusEnum,
} from "./operations/task.schema.js";

import {
  TaskAssignmentCreateSchema,
  TaskAssignmentBulkSchema,
} from "./operations/taskAssignment.schema.js";

import {
  TaskModuleCreateSchema,
  TaskModuleUpdateSchema,
  TaskModuleBulkCreateSchema,
} from "./operations/taskModule.schema.js";

import {
  EntityRegistrationCreateSchema,
  EntityRegistrationUpdateSchema,
  EntityRegistrationStatusEnum,
} from "./compliance/entityRegistration.schema.js";

import {
  ComplianceRuleCreateSchema,
  ComplianceRuleUpdateSchema,
  FrequencyUnitEnum,
} from "./compliance/complianceRule.schema.js";

import {
  TaskTemplateCreateSchema,
  TaskTemplateUpdateSchema,
  TaskTemplateModuleSchema,
} from "./compliance/taskTemplate.schema.js";

import {
  EntityRegistrationSettingCreateSchema,
  EntityRegistrationSettingUpdateSchema,
} from "./compliance/entityRegistrationSetting.schema.js";

import {
  InvoiceCreateSchema,
  InvoiceUpdateSchema,
  InvoiceQuerySchema,
  InvoiceStatusEnum,
} from "./billing/invoice.schema.js";

import {
  InvoiceLineCreateSchema,
  InvoiceLineUpdateSchema,
} from "./billing/invoiceLine.schema.js";

import {
  PaymentCreateSchema,
  PaymentUpdateSchema,
  PaymentQuerySchema,
  PaymentStatusEnum,
} from "./billing/payment.schema.js";

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
    resendOnboardinLink: ResendOnboardingInviteSchema,
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
  },

  department: {
    create: DepartmentCreateSchema,
    update: DepartmentUpdateSchema,
  },

  entityGroup: {
    create: EntityGroupCreateSchema,
    update: EntityGroupUpdateSchema,
    addMember: EntityGroupMemberAddSchema,
    lastMembers: EntityGroupMemberListSchema,
    enums: {
      type: EntityGroupTypeEnum,
      role: EntityGroupRoleEnum,
    },
  },

  // Operations
  task: {
    create: TaskCreateSchema,
    update: TaskUpdateSchema,
    query: TaskQuerySchema,
    enums: {
      status: TaskStatusEnum,
      billingStatus: BillingStatusEnum,
    },
  },

  taskAssignment: {
    create: TaskAssignmentCreateSchema,
    bulk: TaskAssignmentBulkSchema,
  },

  taskModule: {
    create: TaskModuleCreateSchema,
    update: TaskModuleUpdateSchema,
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
    enums: {
      frequencyUnit: FrequencyUnitEnum,
    },
  },

  taskTemplate: {
    create: TaskTemplateCreateSchema,
    update: TaskTemplateUpdateSchema,
    module: TaskTemplateModuleSchema,
  },

  entityRegistrationSetting: {
    create: EntityRegistrationSettingCreateSchema,
    update: EntityRegistrationSettingUpdateSchema,
  },

  // Billing
  invoice: {
    create: InvoiceCreateSchema,
    update: InvoiceUpdateSchema,
    query: InvoiceQuerySchema,
    enums: {
      status: InvoiceStatusEnum,
    },
  },

  invoiceLine: {
    create: InvoiceLineCreateSchema,
    update: InvoiceLineUpdateSchema,
  },

  payment: {
    create: PaymentCreateSchema,
    update: PaymentUpdateSchema,
    query: PaymentQuerySchema,
    enums: {
      status: PaymentStatusEnum,
    },
  },
});

export const enums = {
  entity: schemas.entity.enums,
  task: schemas.task.enums,
  invoice: schemas.invoice.enums,
  payment: schemas.payment.enums,
};
