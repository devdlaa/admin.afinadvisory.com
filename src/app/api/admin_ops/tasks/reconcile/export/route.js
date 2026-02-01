import ExcelJS from "exceljs";
import { schemas } from "@/schemas";
import { getReconcileCharges } from "@/services/task/reconcile.service";
import { requirePermission } from "@/utils/server/requirePermission";
import { handleApiError } from "@/utils/server/apiResponse";
import { ValidationError } from "@/utils/server/errors";

function formatEnum(value) {
  if (!value) return "-";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.reconcile.query.parse({
      entity_id: searchParams.get("entity_id") ?? undefined,
      task_category_id: searchParams.get("task_category_id") ?? undefined,
      from_date: searchParams.get("from_date") ?? undefined,
      to_date: searchParams.get("to_date") ?? undefined,
      order: searchParams.get("order") ?? undefined,
    });

    if (!filters.from_date || !filters.to_date) {
      return new Response(
        JSON.stringify({
          error: "from_date and to_date are required for export",
        }),
        { status: 400 },
      );
    }

    let tasks;

    try {
      tasks = await getReconcileCharges(filters, { exportMode: true });
    } catch (e) {
      if (e instanceof ValidationError) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
        });
      }
      throw e;
    }

    // Flatten tasks -> charges
    const rows = [];
    let totalRecoverable = 0;

    for (const task of tasks) {
      for (const charge of task.charges) {
        const amount = Number(charge.amount);

        if (charge.status === "NOT_PAID" && charge.bearer === "CLIENT") {
          totalRecoverable += amount;
        }

        rows.push({
          entity: task.entity?.name ?? task.entity_id ?? "-",
          task: task.title ?? "-",
          title: charge.title,
          charge_type: formatEnum(charge.charge_type),
          amount,
          status: formatEnum(charge.status),
          bearer: formatEnum(charge.bearer),
          task_status: formatEnum(task.status),
          due_date: task.due_date ?? null,
          created_at: charge.created_at,
        });
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Recoverable Charges", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Entity", key: "entity", width: 28 },
      { header: "Task", key: "task", width: 30 },
      { header: "Charge Title", key: "title", width: 28 },
      { header: "Charge Type", key: "charge_type", width: 16 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Status", key: "status", width: 14 },
      { header: "Bearer", key: "bearer", width: 12 },
      { header: "Task Status", key: "task_status", width: 16 },
      { header: "Task Due Date", key: "due_date", width: 16 },
      { header: "Charge Created At", key: "created_at", width: 20 },
    ];

    // Header styling
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    for (const r of rows) {
      sheet.addRow(r);
    }

    // Formatting
    sheet.getColumn("amount").numFmt = "#,##0.00";
    sheet.getColumn("created_at").numFmt = "dd-mmm-yyyy hh:mm";
    sheet.getColumn("due_date").numFmt = "dd-mmm-yyyy";

    // Recoverable total row
    const totalRow = sheet.addRow({
      title: "TOTAL RECOVERABLE (CLIENT, NOT PAID)",
      amount: totalRecoverable,
    });
    totalRow.font = { bold: true };

    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="recoverables.xlsx"',
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
