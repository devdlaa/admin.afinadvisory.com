import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { schemas } from "@/schemas";
import { getUnreconciledTasks } from "@/services/task/reconcile.service";

import {
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [permissionError] = await requirePermission(req, "reconcile.view");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.reconcile.unreconciled.parse({
      entity_id: searchParams.get("entity_id") ?? undefined,
      task_category_id: searchParams.get("task_category_id") ?? undefined,
      task_status: searchParams.get("task_status") ?? undefined,
      from_date: searchParams.get("from_date") ?? undefined,
      to_date: searchParams.get("to_date") ?? undefined,
      order: searchParams.get("order") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const { total } = await getUnreconciledTasks(filters, {
      countOnly: true,
    });

    if (total > 2000) {
      return createErrorResponse(
        `Export limit (2000) exceeded. ${total} records found. Please narrow your filters.`,
      );
    }

    // extracting the actual records (UNPAGINATED)
    const exportData = await getUnreconciledTasks(filters, {
      exportMode: true,
    });

    // Flatten rows
    const rows = [];

    for (const item of exportData.items) {
      const task = item.task;

      if (!item.charges?.length) {
        rows.push({
          task_id: task?.id,
          task_title: task.title ?? "",
          task_category: task.category?.name ?? "",
          task_status: task.status ?? "",
          priority: task.priority ?? "",
          task_source: task.is_system ? "SYSTEM" : "MANUAL",
          task_created_at: task.created_at ?? "",

          client_id: task.entity?.id ?? "",
          client_name: task.entity?.name ?? "",
          client_email: task.entity?.email ?? "",

          charge_id: "",
          charge_title: "",
          charge_type: "",
          charge_amount: 0,
          charge_status: "",
          charge_remark: "",
          charge_created_at: "",

          reference_type: "",
          reference_by: "",
          reference_email: "",
          reference_phone: "",
          reference_by_id: "",
        });

        continue;
      }

      for (const charge of item.charges) {
        rows.push({
          task_id: task?.id,
          task_title: task.title ?? "",
          task_category: task.category?.name ?? "",
          task_status: task.status ?? "",
          priority: task.priority ?? "",
          task_source: task.is_system ? "SYSTEM" : "MANUAL",
          task_created_at: task.created_at ?? "",
          client_id: task.entity?.id ?? "",
          client_name: task.entity?.name ?? "",
          client_email: task.entity?.email ?? "",
          charge_id: charge.id ?? "",
          charge_title: charge.title ?? "",
          charge_type: charge.charge_type ?? "",
          charge_amount: Number(charge.amount ?? 0),
          charge_status: charge.status ?? "",
          charge_remark: charge.remark ?? "",
          charge_created_at: charge.created_at ?? "",
          reference_type: item?.reference?.type ?? "",
          reference_by: item?.reference?.name ?? "",
          reference_email: item?.reference?.email ?? "",
          reference_phone: item?.reference?.phone ?? "",
          reference_by_id: item?.reference?.id ?? "",
        });
      }
    }

    const workbook = new ExcelJS.Workbook();

    const sheet = workbook.addWorksheet("Unreconciled Charges");

    sheet.columns = [
      { header: "Task ID", key: "task_id", width: 40 },
      { header: "Task Title", key: "task_title", width: 40 },
      { header: "Task Category", key: "task_category", width: 20 },
      { header: "Task Status", key: "task_status", width: 15 },
      { header: "Priority", key: "priority", width: 15 },
      { header: "Task Source", key: "task_source", width: 15 },
      { header: "Task Created At", key: "task_created_at", width: 25 },

      { header: "Client ID", key: "client_id", width: 40 },
      { header: "Client Name", key: "client_name", width: 30 },
      { header: "Client Email", key: "client_email", width: 35 },

      { header: "Charge ID", key: "charge_id", width: 40 },
      { header: "Charge Title", key: "charge_title", width: 30 },
      { header: "Charge Type", key: "charge_type", width: 25 },
      { header: "Charge Amount", key: "charge_amount", width: 20 },
      { header: "Charge Status", key: "charge_status", width: 15 },
      { header: "Charge Remark", key: "charge_remark", width: 40 },
      { header: "Charge Created At", key: "charge_created_at", width: 25 },
      { header: "Reference Type", key: "reference_type", width: 25 },
      { header: "Reference By", key: "reference_by", width: 25 },
      { header: "Reference Phone", key: "reference_phone", width: 25 },
      { header: "Reference Email", key: "reference_email", width: 25 },
      { header: "Reference ID", key: "reference_by_id", width: 25 },
    ];

    sheet.addRows(rows);

    // Header styling
    const headerRow = sheet.getRow(1);

    headerRow.font = {
      bold: true,
    };

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE7E6E6" },
      };

      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Amount formatting
    sheet.getColumn("charge_amount").numFmt = "₹#,##0.00";

    // Freeze header
    sheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="tasks-charges.xlsx"',
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
