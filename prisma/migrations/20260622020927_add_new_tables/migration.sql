-- CreateTable
CREATE TABLE "admin_user_pinned_boards" (
    "admin_user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,

    CONSTRAINT "admin_user_pinned_boards_pkey" PRIMARY KEY ("admin_user_id","category_id")
);

-- CreateIndex
CREATE INDEX "admin_user_pinned_boards_admin_user_id_idx" ON "admin_user_pinned_boards"("admin_user_id");

-- CreateIndex
CREATE INDEX "admin_user_pinned_boards_category_id_idx" ON "admin_user_pinned_boards"("category_id");

-- AddForeignKey
ALTER TABLE "admin_user_pinned_boards" ADD CONSTRAINT "admin_user_pinned_boards_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_pinned_boards" ADD CONSTRAINT "admin_user_pinned_boards_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "TaskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
