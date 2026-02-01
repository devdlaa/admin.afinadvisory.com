-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('INDIVIDUAL', 'PRIVATE_LIMITED_COMPANY', 'PUBLIC_LIMITED_COMPANY', 'ONE_PERSON_COMPANY', 'SECTION_8_COMPANY', 'PRODUCER_COMPANY', 'SOLE_PROPRIETORSHIP', 'PARTNERSHIP_FIRM', 'LIMITED_LIABILITY_PARTNERSHIP', 'TRUST', 'SOCIETY', 'COOPERATIVE_SOCIETY', 'FOREIGN_COMPANY', 'GOVERNMENT_COMPANY');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EntityRegistrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('NOT_BILLED', 'PARTIALLY_BILLED', 'BILLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'RECEIVED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EntityGroupType" AS ENUM ('FAMILY', 'BUSINESS', 'TRUST', 'PARTNERSHIP', 'ORGANIZATION', 'NON_PROFIT', 'COOPERATIVE', 'ASSOCIATION', 'JOINT_VENTURE', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EntityGroupRole" AS ENUM ('OWNER', 'CO_OWNER', 'BENEFICIARY', 'MEMBER', 'MANAGING_MEMBER', 'DIRECTOR', 'EXECUTIVE_DIRECTOR', 'NOMINEE_DIRECTOR', 'PARTNER', 'MANAGING_PARTNER', 'TRUSTEE', 'SETTLOR', 'SHAREHOLDER', 'AUTHORIZED_SIGNATORY', 'REPRESENTATIVE', 'EMPLOYEE', 'ADVISOR', 'OBSERVER', 'OTHER');

-- CreateEnum
CREATE TYPE "FrequencyUnit" AS ENUM ('DAY', 'MONTH', 'YEAR');

-- CreateTable
CREATE TABLE "Entity" (
    "id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "name" CHAR(120) NOT NULL,
    "pan" CHAR(10) NOT NULL,
    "tan" CHAR(10),
    "email" TEXT,
    "primary_phone" TEXT NOT NULL,
    "secondary_phone" TEXT,
    "address_line1" CHAR(200) NOT NULL,
    "address_line2" CHAR(200),
    "city" CHAR(50) NOT NULL,
    "state" CHAR(50) NOT NULL,
    "pincode" CHAR(6),
    "is_retainer" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'INACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "group_type" "EntityGroupType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityGroupMember" (
    "id" UUID NOT NULL,
    "entity_group_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "role" "EntityGroupRole" NOT NULL,

    CONSTRAINT "EntityGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityRegistration" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "registration_type_id" UUID NOT NULL,
    "registration_number" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "status" "EntityRegistrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityRegistrationSetting" (
    "id" UUID NOT NULL,
    "entity_registration_id" UUID NOT NULL,
    "compliance_rule_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityRegistrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" UUID NOT NULL,
    "compliance_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registration_type_id" UUID NOT NULL,
    "applicable_entity_types" JSONB NOT NULL,
    "frequency_interval" INTEGER NOT NULL,
    "frequency_unit" "FrequencyUnit" NOT NULL DEFAULT 'MONTH',
    "due_day" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUserDepartment" (
    "admin_user_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,

    CONSTRAINT "AdminUserDepartment_pkey" PRIMARY KEY ("admin_user_id","department_id")
);

-- CreateTable
CREATE TABLE "AdminUserRole" (
    "admin_user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "AdminUserRole_pkey" PRIMARY KEY ("admin_user_id","role_id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "billing_status" "BillingStatus" NOT NULL DEFAULT 'NOT_BILLED',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "priority" TEXT,
    "category" TEXT,
    "compliance_rule_id" UUID,
    "is_assigned_to_all" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "assignment_source" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" UUID NOT NULL,
    "compliance_rule_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "title_template" TEXT NOT NULL,
    "description_template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplateModule" (
    "id" UUID NOT NULL,
    "task_template_id" UUID NOT NULL,
    "billable_module_id" UUID NOT NULL,
    "default_quantity" INTEGER NOT NULL DEFAULT 1,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskTemplateModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillableModule" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "default_price" DECIMAL(65,30) NOT NULL,
    "gst_rate" DECIMAL(65,30) NOT NULL,
    "sac_code" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillableModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskModule" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "billable_module_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "gst_rate" DECIMAL(65,30) NOT NULL,
    "sac_code" TEXT,
    "quantity" INTEGER NOT NULL,
    "is_billed" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "gstin" TEXT,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "gst_amount" DECIMAL(65,30) NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "task_module_id" UUID NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(65,30) NOT NULL,
    "gst_rate" DECIMAL(65,30) NOT NULL,
    "gst_amount" DECIMAL(65,30) NOT NULL,
    "line_total" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "received_by" UUID NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "reference_number" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entity_pan_key" ON "Entity"("pan");

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "Entity"("name");

-- CreateIndex
CREATE INDEX "Entity_status_idx" ON "Entity"("status");

-- CreateIndex
CREATE INDEX "Entity_pan_idx" ON "Entity"("pan");

-- CreateIndex
CREATE INDEX "Entity_email_idx" ON "Entity"("email");

-- CreateIndex
CREATE INDEX "Entity_created_at_idx" ON "Entity"("created_at");

-- CreateIndex
CREATE INDEX "Entity_is_retainer_status_idx" ON "Entity"("is_retainer", "status");

-- CreateIndex
CREATE INDEX "Entity_status_is_retainer_created_at_idx" ON "Entity"("status", "is_retainer", "created_at");

-- CreateIndex
CREATE INDEX "EntityGroup_group_type_idx" ON "EntityGroup"("group_type");

-- CreateIndex
CREATE INDEX "EntityGroup_created_at_idx" ON "EntityGroup"("created_at");

-- CreateIndex
CREATE INDEX "EntityGroupMember_entity_group_id_idx" ON "EntityGroupMember"("entity_group_id");

-- CreateIndex
CREATE INDEX "EntityGroupMember_entity_id_idx" ON "EntityGroupMember"("entity_id");

-- CreateIndex
CREATE INDEX "EntityGroupMember_role_idx" ON "EntityGroupMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "EntityGroupMember_entity_group_id_entity_id_key" ON "EntityGroupMember"("entity_group_id", "entity_id");

-- CreateIndex
CREATE INDEX "EntityRegistration_status_idx" ON "EntityRegistration"("status");

-- CreateIndex
CREATE INDEX "EntityRegistration_entity_id_idx" ON "EntityRegistration"("entity_id");

-- CreateIndex
CREATE INDEX "EntityRegistration_registration_type_id_idx" ON "EntityRegistration"("registration_type_id");

-- CreateIndex
CREATE INDEX "EntityRegistration_is_primary_idx" ON "EntityRegistration"("is_primary");

-- CreateIndex
CREATE INDEX "EntityRegistration_effective_from_effective_to_idx" ON "EntityRegistration"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "EntityRegistration_entity_id_status_idx" ON "EntityRegistration"("entity_id", "status");

-- CreateIndex
CREATE INDEX "EntityRegistration_registration_type_id_status_idx" ON "EntityRegistration"("registration_type_id", "status");

-- CreateIndex
CREATE INDEX "EntityRegistration_entity_id_status_effective_to_idx" ON "EntityRegistration"("entity_id", "status", "effective_to");

-- CreateIndex
CREATE UNIQUE INDEX "EntityRegistration_entity_id_registration_type_id_registrat_key" ON "EntityRegistration"("entity_id", "registration_type_id", "registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationType_code_key" ON "RegistrationType"("code");

-- CreateIndex
CREATE INDEX "RegistrationType_is_active_idx" ON "RegistrationType"("is_active");

-- CreateIndex
CREATE INDEX "RegistrationType_code_idx" ON "RegistrationType"("code");

-- CreateIndex
CREATE INDEX "EntityRegistrationSetting_entity_registration_id_idx" ON "EntityRegistrationSetting"("entity_registration_id");

-- CreateIndex
CREATE INDEX "EntityRegistrationSetting_compliance_rule_id_idx" ON "EntityRegistrationSetting"("compliance_rule_id");

-- CreateIndex
CREATE INDEX "EntityRegistrationSetting_is_enabled_idx" ON "EntityRegistrationSetting"("is_enabled");

-- CreateIndex
CREATE INDEX "EntityRegistrationSetting_effective_from_effective_to_idx" ON "EntityRegistrationSetting"("effective_from", "effective_to");

-- CreateIndex
CREATE UNIQUE INDEX "EntityRegistrationSetting_entity_registration_id_compliance_key" ON "EntityRegistrationSetting"("entity_registration_id", "compliance_rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRule_compliance_code_key" ON "ComplianceRule"("compliance_code");

-- CreateIndex
CREATE INDEX "ComplianceRule_registration_type_id_idx" ON "ComplianceRule"("registration_type_id");

-- CreateIndex
CREATE INDEX "ComplianceRule_is_active_idx" ON "ComplianceRule"("is_active");

-- CreateIndex
CREATE INDEX "ComplianceRule_compliance_code_idx" ON "ComplianceRule"("compliance_code");

-- CreateIndex
CREATE INDEX "ComplianceRule_registration_type_id_is_active_idx" ON "ComplianceRule"("registration_type_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_name_idx" ON "AdminUser"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "AdminUserDepartment_admin_user_id_idx" ON "AdminUserDepartment"("admin_user_id");

-- CreateIndex
CREATE INDEX "AdminUserDepartment_department_id_idx" ON "AdminUserDepartment"("department_id");

-- CreateIndex
CREATE INDEX "AdminUserRole_admin_user_id_idx" ON "AdminUserRole"("admin_user_id");

-- CreateIndex
CREATE INDEX "AdminUserRole_role_id_idx" ON "AdminUserRole"("role_id");

-- CreateIndex
CREATE INDEX "RolePermission_role_id_idx" ON "RolePermission"("role_id");

-- CreateIndex
CREATE INDEX "RolePermission_permission_id_idx" ON "RolePermission"("permission_id");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_billing_status_idx" ON "Task"("billing_status");

-- CreateIndex
CREATE INDEX "Task_entity_id_idx" ON "Task"("entity_id");

-- CreateIndex
CREATE INDEX "Task_created_by_idx" ON "Task"("created_by");

-- CreateIndex
CREATE INDEX "Task_due_date_idx" ON "Task"("due_date");

-- CreateIndex
CREATE INDEX "Task_created_at_idx" ON "Task"("created_at");

-- CreateIndex
CREATE INDEX "Task_compliance_rule_id_idx" ON "Task"("compliance_rule_id");

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- CreateIndex
CREATE INDEX "Task_entity_id_status_idx" ON "Task"("entity_id", "status");

-- CreateIndex
CREATE INDEX "Task_entity_id_status_due_date_idx" ON "Task"("entity_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "Task_status_billing_status_idx" ON "Task"("status", "billing_status");

-- CreateIndex
CREATE INDEX "Task_status_due_date_idx" ON "Task"("status", "due_date");

-- CreateIndex
CREATE INDEX "Task_compliance_rule_id_status_idx" ON "Task"("compliance_rule_id", "status");

-- CreateIndex
CREATE INDEX "TaskAssignment_task_id_idx" ON "TaskAssignment"("task_id");

-- CreateIndex
CREATE INDEX "TaskAssignment_admin_user_id_idx" ON "TaskAssignment"("admin_user_id");

-- CreateIndex
CREATE INDEX "TaskAssignment_assigned_by_idx" ON "TaskAssignment"("assigned_by");

-- CreateIndex
CREATE INDEX "TaskAssignment_assigned_at_idx" ON "TaskAssignment"("assigned_at");

-- CreateIndex
CREATE INDEX "TaskAssignment_admin_user_id_task_id_idx" ON "TaskAssignment"("admin_user_id", "task_id");

-- CreateIndex
CREATE INDEX "TaskTemplate_compliance_rule_id_idx" ON "TaskTemplate"("compliance_rule_id");

-- CreateIndex
CREATE INDEX "TaskTemplate_created_by_idx" ON "TaskTemplate"("created_by");

-- CreateIndex
CREATE INDEX "TaskTemplate_is_active_idx" ON "TaskTemplate"("is_active");

-- CreateIndex
CREATE INDEX "TaskTemplate_compliance_rule_id_is_active_idx" ON "TaskTemplate"("compliance_rule_id", "is_active");

-- CreateIndex
CREATE INDEX "TaskTemplateModule_task_template_id_idx" ON "TaskTemplateModule"("task_template_id");

-- CreateIndex
CREATE INDEX "TaskTemplateModule_billable_module_id_idx" ON "TaskTemplateModule"("billable_module_id");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplateModule_task_template_id_billable_module_id_key" ON "TaskTemplateModule"("task_template_id", "billable_module_id");

-- CreateIndex
CREATE INDEX "BillableModule_category_idx" ON "BillableModule"("category");

-- CreateIndex
CREATE INDEX "BillableModule_is_active_idx" ON "BillableModule"("is_active");

-- CreateIndex
CREATE INDEX "BillableModule_is_deleted_idx" ON "BillableModule"("is_deleted");

-- CreateIndex
CREATE INDEX "BillableModule_created_by_idx" ON "BillableModule"("created_by");

-- CreateIndex
CREATE INDEX "BillableModule_is_active_is_deleted_idx" ON "BillableModule"("is_active", "is_deleted");

-- CreateIndex
CREATE INDEX "BillableModule_category_is_active_idx" ON "BillableModule"("category", "is_active");

-- CreateIndex
CREATE INDEX "TaskModule_task_id_idx" ON "TaskModule"("task_id");

-- CreateIndex
CREATE INDEX "TaskModule_billable_module_id_idx" ON "TaskModule"("billable_module_id");

-- CreateIndex
CREATE INDEX "TaskModule_is_billed_idx" ON "TaskModule"("is_billed");

-- CreateIndex
CREATE INDEX "TaskModule_is_deleted_idx" ON "TaskModule"("is_deleted");

-- CreateIndex
CREATE INDEX "TaskModule_created_by_idx" ON "TaskModule"("created_by");

-- CreateIndex
CREATE INDEX "TaskModule_task_id_is_billed_idx" ON "TaskModule"("task_id", "is_billed");

-- CreateIndex
CREATE INDEX "TaskModule_task_id_is_deleted_idx" ON "TaskModule"("task_id", "is_deleted");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_entity_id_idx" ON "Invoice"("entity_id");

-- CreateIndex
CREATE INDEX "Invoice_created_by_idx" ON "Invoice"("created_by");

-- CreateIndex
CREATE INDEX "Invoice_invoice_date_idx" ON "Invoice"("invoice_date");

-- CreateIndex
CREATE INDEX "Invoice_entity_id_status_idx" ON "Invoice"("entity_id", "status");

-- CreateIndex
CREATE INDEX "Invoice_entity_id_status_invoice_date_idx" ON "Invoice"("entity_id", "status", "invoice_date");

-- CreateIndex
CREATE INDEX "Invoice_status_invoice_date_idx" ON "Invoice"("status", "invoice_date");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoice_id_idx" ON "InvoiceLine"("invoice_id");

-- CreateIndex
CREATE INDEX "InvoiceLine_task_id_idx" ON "InvoiceLine"("task_id");

-- CreateIndex
CREATE INDEX "InvoiceLine_task_module_id_idx" ON "InvoiceLine"("task_module_id");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_idx" ON "Payment"("invoice_id");

-- CreateIndex
CREATE INDEX "Payment_entity_id_idx" ON "Payment"("entity_id");

-- CreateIndex
CREATE INDEX "Payment_received_by_idx" ON "Payment"("received_by");

-- CreateIndex
CREATE INDEX "Payment_payment_date_idx" ON "Payment"("payment_date");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_entity_id_status_idx" ON "Payment"("entity_id", "status");

-- CreateIndex
CREATE INDEX "Payment_entity_id_payment_date_idx" ON "Payment"("entity_id", "payment_date");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_status_idx" ON "Payment"("invoice_id", "status");

-- AddForeignKey
ALTER TABLE "EntityGroupMember" ADD CONSTRAINT "EntityGroupMember_entity_group_id_fkey" FOREIGN KEY ("entity_group_id") REFERENCES "EntityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityGroupMember" ADD CONSTRAINT "EntityGroupMember_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistration" ADD CONSTRAINT "EntityRegistration_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistration" ADD CONSTRAINT "EntityRegistration_registration_type_id_fkey" FOREIGN KEY ("registration_type_id") REFERENCES "RegistrationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistrationSetting" ADD CONSTRAINT "EntityRegistrationSetting_entity_registration_id_fkey" FOREIGN KEY ("entity_registration_id") REFERENCES "EntityRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistrationSetting" ADD CONSTRAINT "EntityRegistrationSetting_compliance_rule_id_fkey" FOREIGN KEY ("compliance_rule_id") REFERENCES "ComplianceRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRule" ADD CONSTRAINT "ComplianceRule_registration_type_id_fkey" FOREIGN KEY ("registration_type_id") REFERENCES "RegistrationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserDepartment" ADD CONSTRAINT "AdminUserDepartment_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserDepartment" ADD CONSTRAINT "AdminUserDepartment_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserRole" ADD CONSTRAINT "AdminUserRole_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserRole" ADD CONSTRAINT "AdminUserRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_compliance_rule_id_fkey" FOREIGN KEY ("compliance_rule_id") REFERENCES "ComplianceRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplateModule" ADD CONSTRAINT "TaskTemplateModule_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplateModule" ADD CONSTRAINT "TaskTemplateModule_billable_module_id_fkey" FOREIGN KEY ("billable_module_id") REFERENCES "BillableModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillableModule" ADD CONSTRAINT "BillableModule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillableModule" ADD CONSTRAINT "BillableModule_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskModule" ADD CONSTRAINT "TaskModule_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskModule" ADD CONSTRAINT "TaskModule_billable_module_id_fkey" FOREIGN KEY ("billable_module_id") REFERENCES "BillableModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskModule" ADD CONSTRAINT "TaskModule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskModule" ADD CONSTRAINT "TaskModule_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskModule" ADD CONSTRAINT "TaskModule_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_task_module_id_fkey" FOREIGN KEY ("task_module_id") REFERENCES "TaskModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
