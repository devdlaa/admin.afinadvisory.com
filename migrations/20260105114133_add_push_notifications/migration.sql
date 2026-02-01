-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'HUF';

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_entity_id_fkey";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assigned_to_all" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "comment_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_comment_at" TIMESTAMP(3),
ADD COLUMN     "last_commented_by" UUID,
ADD COLUMN     "task_category_id" UUID,
ALTER COLUMN "entity_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPushToken" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_name_key" ON "TaskCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_code_key" ON "TaskCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserPushToken_token_key" ON "UserPushToken"("token");

-- CreateIndex
CREATE INDEX "UserPushToken_user_id_idx" ON "UserPushToken"("user_id");

-- CreateIndex
CREATE INDEX "Task_task_category_id_idx" ON "Task"("task_category_id");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_task_category_id_fkey" FOREIGN KEY ("task_category_id") REFERENCES "TaskCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPushToken" ADD CONSTRAINT "UserPushToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
