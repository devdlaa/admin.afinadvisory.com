-- AlterTable
ALTER TABLE "TaskCharge" ADD COLUMN     "paid_via_invoice_id" TEXT;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_paid_via_invoice_id_fkey" FOREIGN KEY ("paid_via_invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
