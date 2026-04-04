import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { requirePermission } from "@/utils/server/requirePermission";

import { schemas } from "@/schemas";
import { handleApiError } from "@/utils/server/apiResponse";

import { getInvoiceDetails } from "@/services/task/invoicing.service";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "invoice.manage",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.invoice.getDetails.parse({ params: resolvedParams });

    const data = await getInvoiceDetails(parsed.params.id);

    if (!data) {
      throw new Error(
        "Something Went Wrong, While Generating Invoice Export Sheet.",
      );
    }

    const workbook = new ExcelJS.Workbook();

    /* ============================================================
     * Sheet 1: Invoice Summary
     * ============================================================
     */
    const summary = workbook.addWorksheet("Invoice Summary");
    summary.columns = [{ width: 30 }, { width: 50 }];

    const addSummaryRow = (label, value, options = {}) => {
      const row = summary.addRow([label, value ?? "—"]);
      row.getCell(1).font = { bold: true };
      row.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };

      if (options.isAmount) {
        row.getCell(2).numFmt = "₹#,##0.00";
        row.getCell(2).alignment = { horizontal: "right" };
      }

      if (options.isTotal) {
        row.font = { bold: true, size: 13 };
        row.getCell(2).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFE599" },
        };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    };

    // Title
    const titleRow = summary.addRow(["INVOICE SUMMARY"]);
    titleRow.font = { bold: true, size: 16 };
    summary.addRow([]);

    // Invoice Details
    const invoiceHeaderRow = summary.addRow(["Invoice Information"]);
    invoiceHeaderRow.font = {
      bold: true,
      size: 12,
      color: { argb: "FF1F4788" },
    };

    addSummaryRow("Invoice Number", data.invoice.internal_number);
    addSummaryRow("External Number", data.invoice.external_number);
    addSummaryRow("Status", data.invoice.status);
    addSummaryRow("Invoice Date", data.invoice.invoice_date);
    addSummaryRow("Issued Date", data.invoice.issued_at);
    addSummaryRow("Paid Date", data.invoice.paid_at);
    summary.addRow([]);

    // Client Details
    const clientHeaderRow = summary.addRow(["Client Information"]);
    clientHeaderRow.font = {
      bold: true,
      size: 12,
      color: { argb: "FF1F4788" },
    };

    addSummaryRow("Client Name", data.entity?.name);
    addSummaryRow("Email", data.entity?.email);
    addSummaryRow("PAN", data.entity?.pan);
    addSummaryRow("Primary Phone", data.entity?.primary_phone);
    addSummaryRow("Secondary Phone", data.entity?.secondary_phone);
    summary.addRow([]);

    // Company Details
    const companyHeaderRow = summary.addRow(["Company Information"]);
    companyHeaderRow.font = {
      bold: true,
      size: 12,
      color: { argb: "FF1F4788" },
    };

    addSummaryRow("Company Name", data.company_profile?.name);
    addSummaryRow("Legal Name", data.company_profile?.legal_name);
    addSummaryRow("GST Number", data.company_profile?.gst_number);
    addSummaryRow("PAN", data.company_profile?.pan);
    addSummaryRow("Email", data.company_profile?.email);
    addSummaryRow("Phone", data.company_profile?.phone);

    const address = [
      data.company_profile?.address_line1,
      data.company_profile?.address_line2,
      data.company_profile?.city,
      data.company_profile?.state,
      data.company_profile?.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    addSummaryRow("Address", address || "—");
    summary.addRow([]);

    // Calculate totals
    let totalServiceFee = 0;
    let totalGovtFee = 0;
    let totalExternalCharge = 0;

    data.groups.forEach((task) => {
      task.charges.forEach((charge) => {
        const amount = Number(charge.amount);
        if (charge.charge_type === "SERVICE_FEE") {
          totalServiceFee += amount;
        } else if (charge.charge_type === "GOVERNMENT_FEE") {
          totalGovtFee += amount;
        } else if (charge.charge_type === "EXTERNAL_CHARGE") {
          totalExternalCharge += amount;
        }
      });
    });

    const grandTotal = totalServiceFee + totalGovtFee + totalExternalCharge;

    // Financial Summary
    const financialHeaderRow = summary.addRow(["Financial Summary"]);
    financialHeaderRow.font = {
      bold: true,
      size: 12,
      color: { argb: "FF1F4788" },
    };

    addSummaryRow("Service Fee", totalServiceFee, { isAmount: true });
    addSummaryRow("Government Fee", totalGovtFee, { isAmount: true });
    addSummaryRow("External Charges", totalExternalCharge, { isAmount: true });
    addSummaryRow("GRAND TOTAL", grandTotal, { isAmount: true, isTotal: true });

    /* ============================================================
     * Sheet 2: Tasks & Charges Breakdown - EXACT FORMAT
     * ============================================================
     */
    const sheet = workbook.addWorksheet("Tasks & Charges");

    // Set column widths
    sheet.columns = [
      { width: 15 }, // A
      { width: 25 }, // B
      { width: 30 }, // C
      { width: 18 }, // D
      { width: 18 }, // E
      { width: 25 }, // F
    ];

    let currentRow = 1;

    data.groups.forEach((task, taskIndex) => {
      const taskNum = taskIndex + 1;
      const taskStartRow = currentRow;

      // Row 1: Task Header Labels
      sheet.getCell(`A${currentRow}`).value = `Task #${taskNum}`;
      sheet.getCell(`B${currentRow}`).value = "Task Type";
      sheet.getCell(`C${currentRow}`).value = "Task Title";
      sheet.getCell(`D${currentRow}`).value = "Status";

      // Row 2: Task Data Values
      currentRow++;
      sheet.getCell(`B${currentRow}`).value = task.task_type;
      sheet.getCell(`C${currentRow}`).value = task.title;
      sheet.getCell(`D${currentRow}`).value = task.status;

      // Merge A cells for Task #
      sheet.mergeCells(`A${taskStartRow}:A${currentRow}`);

      // Style merged Task # cell
      const taskCell = sheet.getCell(`A${taskStartRow}`);
      taskCell.font = { bold: true, size: 12 };
      taskCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCD5B4" },
      };
      taskCell.alignment = { vertical: "middle", horizontal: "center" };
      taskCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Style Row 1 cells (B, C, D)
      ["B", "C", "D"].forEach((col, idx) => {
        const cell = sheet.getCell(`${col}${taskStartRow}`);
        cell.font = { bold: true, size: 11 };
        cell.alignment = {    vertical: "middle",
          horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        if (col === "B") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE7E6E6" },
          };
        } else if (col === "C") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE7E6E6" },
          };
        } else {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE7E6E6" },
          };
        }
      });

      // Style Row 2 cells (B, C, D)
      ["B", "C", "D"].forEach((col) => {
        const cell = sheet.getCell(`${col}${currentRow}`);
        cell.font = { bold: col === "B", size: 11 };
        cell.alignment = {    vertical: "middle",
          horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        if (col === "B") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE7E6E6" },
          };
        } else if (col === "C") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE7E6E6" },
          };
        } else {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE7E6E6" },
          };
        }
      });

      currentRow++;

      // Row 3: Charges Header
      const chargesStartRow = currentRow;
      sheet.getCell(`A${currentRow}`).value = "CHARGES";
      sheet.getCell(`B${currentRow}`).value = "Charge Title";
      sheet.getCell(`C${currentRow}`).value = "Charge Type";
      sheet.getCell(`D${currentRow}`).value = "Amount";
      sheet.getCell(`E${currentRow}`).value = "Status";
      sheet.getCell(`F${currentRow}`).value = "Remark";

      ["A", "B", "C", "D", "E", "F"].forEach((col) => {
        const cell = sheet.getCell(`${col}${currentRow}`);
        cell.font = { bold: true, size: 11 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCD5B4" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      currentRow++;

      const amountCells = [];
      const chargesDataStartRow = currentRow;

      // Charge rows
      task.charges.forEach((charge) => {
        sheet.getCell(`A${currentRow}`).value = "CHARGES";
        sheet.getCell(`B${currentRow}`).value = charge.title;
        sheet.getCell(`C${currentRow}`).value = charge.charge_type;
        sheet.getCell(`D${currentRow}`).value = Number(charge.amount);
        sheet.getCell(`E${currentRow}`).value = charge.status;
        sheet.getCell(`F${currentRow}`).value = charge.remark ?? "—";

        // Style A
        sheet.getCell(`A${currentRow}`).font = { bold: true, size: 11 };
        sheet.getCell(`A${currentRow}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFCD5B4" },
        };
        sheet.getCell(`A${currentRow}`).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        sheet.getCell(`A${currentRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Style B, C
        ["B", "C"].forEach((col) => {
          const cell = sheet.getCell(`${col}${currentRow}`);
          cell.font = { size: 11 };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        // Style D (Amount)
        sheet.getCell(`D${currentRow}`).numFmt = "₹#,##0.00";
        sheet.getCell(`D${currentRow}`).font = { size: 11 };
        sheet.getCell(`D${currentRow}`).alignment = {
          vertical: "middle",
          horizontal: "center"
        };
       
        sheet.getCell(`D${currentRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Style E
        sheet.getCell(`E${currentRow}`).font = { size: 11 };
        sheet.getCell(`E${currentRow}`).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        sheet.getCell(`E${currentRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Style F
        sheet.getCell(`F${currentRow}`).font = { size: 11 };
        sheet.getCell(`F${currentRow}`).alignment = {
         vertical: "middle",
          horizontal: "center"
        };
        sheet.getCell(`F${currentRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        amountCells.push(`D${currentRow}`);
        currentRow++;
      });

      // Merge CHARGES cells
      if (task.charges.length > 0) {
        sheet.mergeCells(
          `A${chargesStartRow}:A${chargesDataStartRow + task.charges.length - 1}`,
        );
      }

      // Task Total Row
      if (amountCells.length > 0) {
        ["A", "B"].forEach((col) => {
          const cell = sheet.getCell(`${col}${currentRow}`);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        sheet.getCell(`C${currentRow}`).value = "Task Total";
        sheet.getCell(`C${currentRow}`).font = { bold: true, size: 11 };
        sheet.getCell(`C${currentRow}`).alignment = {
           vertical: "middle",
          horizontal: "center"
        };
      
        sheet.getCell(`C${currentRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        sheet.getCell(`D${currentRow}`).value = {
          formula: `SUM(${amountCells.join(",")})`,
        };
        sheet.getCell(`D${currentRow}`).numFmt = "₹#,##0.00";
        sheet.getCell(`D${currentRow}`).font = { bold: true, size: 11 };
        sheet.getCell(`D${currentRow}`).alignment = {
        vertical: "middle",
          horizontal: "center"
        };
      
        sheet.getCell(`D${currentRow}`).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        ["E", "F"].forEach((col) => {
          const cell = sheet.getCell(`${col}${currentRow}`);
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        currentRow++;
      }

      currentRow += 2;
    });

    /* ============================================================
     * Response
     * ============================================================
     */
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="invoice-${data.invoice.internal_number}.xlsx"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}