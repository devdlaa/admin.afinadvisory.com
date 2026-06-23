import ExcelJS from "exceljs";
import { schemas } from "@/schemas";
import { bulkCreateEntities } from "@/services/entity/entity.service";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  handleApiError,
  createErrorResponse,
} from "@/utils/server/apiResponse";

const PREDEFINED_FIELD_NAMES = [
  "GST Number",
  "TAN Number",
  "CIN Number",
  "Website",
  "Client Code",
  "Preferred Language",
  "Custom",
];

export async function POST(req) {
  try {
    const [permissionError, session,admin_user] = await requirePermission(
      req,
      "entities.manage"
    );
    if (permissionError) return permissionError;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return createErrorResponse("File is required", 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return createErrorResponse("File too large (max 5MB)", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ---- Parse Excel ----
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return createErrorResponse("No worksheet found in file", 400);
    }

    const headers = [];
    worksheet.getRow(1).eachCell((cell, col) => {
      headers[col - 1] = String(cell.value || "").trim();
    });

    const rawRows = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const obj = {};
      headers.forEach((key, idx) => {
        const cellValue = row.getCell(idx + 1).value;
        obj[key] = cellValue ?? null;
      });

      rawRows.push(obj);
    });

    // ---- Filter out completely empty rows ----
    const nonEmptyRows = rawRows.filter((row) => {
      // A row is considered non-empty if it has at least name, email, or entity_type
      return row.name || row.email || row.entity_type || row.primary_phone;
    });

    if (!nonEmptyRows.length) {
      return createErrorResponse(
        "The uploaded file contains no data rows",
        400
      );
    }

    if (nonEmptyRows.length > 500) {
      return createErrorResponse("Maximum 500 rows allowed per import", 400);
    }

    // ---- Preprocess and convert data types ----
    nonEmptyRows.forEach((row) => {
      // Convert phone numbers to strings (Excel often treats them as numbers)
      if (row.primary_phone !== null && row.primary_phone !== undefined) {
        row.primary_phone = String(row.primary_phone).trim();
      }

      if (row.secondary_phone !== null && row.secondary_phone !== undefined) {
        row.secondary_phone = String(row.secondary_phone).trim();
      }

      // Convert pincode to string
      if (row.pincode !== null && row.pincode !== undefined) {
        row.pincode = String(row.pincode).trim();
      }

      // Convert entity_type to string and trim
      if (row.entity_type !== null && row.entity_type !== undefined) {
        row.entity_type = String(row.entity_type).trim().toUpperCase();
      }

      // Convert status to string and trim, with default
      if (row.status !== null && row.status !== undefined) {
        row.status = String(row.status).trim().toUpperCase();
      } else {
        row.status = "ACTIVE"; // Default value
      }

      

      // Trim all string fields
      if (row.name) row.name = String(row.name).trim();
      if (row.email) row.email = String(row.email).trim();
      if (row.pan) row.pan = String(row.pan).trim();
      if (row.contact_person)
        row.contact_person = String(row.contact_person).trim();
      if (row.address_line1)
        row.address_line1 = String(row.address_line1).trim();
      if (row.address_line2)
        row.address_line2 = String(row.address_line2).trim();
      if (row.city) row.city = String(row.city).trim();
      if (row.state) row.state = String(row.state).trim();
    });

    // ---- Convert custom field columns to custom_fields array ----
    nonEmptyRows.forEach((row) => {
      const customFields = [];

      for (let i = 1; i <= 10; i++) {
        const n = String(i).padStart(2, "0");
        let fieldName = row[`custom_field_${n}`];
        const fieldValue = row[`custom_field_value_${n}`];

        // Skip if no field name provided
        if (!fieldName || String(fieldName).trim() === "") {
          delete row[`custom_field_${n}`];
          delete row[`custom_field_value_${n}`];
          continue;
        }

        fieldName = String(fieldName).trim();

        // Validate that it's either a predefined name or a valid custom name
        const isValid =
          PREDEFINED_FIELD_NAMES.includes(fieldName) ||
          /^[a-zA-Z0-9 _-]+$/.test(fieldName);

        if (!isValid) {
          // This will be caught by Zod validation later
          // Just pass it through for now
        }

        customFields.push({
          name: fieldName,
          value:
            fieldValue !== null && fieldValue !== undefined
              ? String(fieldValue).trim()
              : null,
        });

        delete row[`custom_field_${n}`];
        delete row[`custom_field_value_${n}`];
      }

      if (customFields.length) {
        row.custom_fields = customFields;
      }
    });

    // ---- Zod validation ----
    const validRows = schemas.entity.bulkImport.parse(nonEmptyRows);
 
    // ---- Service call ----
    const result = await bulkCreateEntities(validRows, admin_user.id);

    return createSuccessResponse("Import completed", {
      summary: {
        added: result.added.length,
        skipped: result.skipped.length,
        failed: result.failed.length,
      },
      ...result,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
