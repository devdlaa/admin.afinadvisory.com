import { requirePermission } from "@/utils/server/requirePermission";
import ExcelJS from "exceljs";

const ENTITY_TYPES = [
  "UN_REGISTRED",
  "INDIVIDUAL",
  "PRIVATE_LIMITED_COMPANY",
  "PUBLIC_LIMITED_COMPANY",
  "ONE_PERSON_COMPANY",
  "SECTION_8_COMPANY",
  "PRODUCER_COMPANY",
  "SOLE_PROPRIETORSHIP",
  "PARTNERSHIP_FIRM",
  "LIMITED_LIABILITY_PARTNERSHIP",
  "TRUST",
  "HUF",
  "ASSOCIATION_OF_PERSON",
  "SOCIETY",
  "COOPERATIVE_SOCIETY",
  "FOREIGN_COMPANY",
  "GOVERNMENT_COMPANY",
];

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "SUSPENDED"];

const PREDEFINED_FIELD_NAMES = [
  "GST Number",
  "TAN Number",
  "CIN Number",
  "Website",
  "Client Code",
  "Preferred Language",
  "Custom",
];

export async function GET(req) {
  const [permissionError, session] = await requirePermission(
    req,
    "entities.manage"
  );
  if (permissionError) return permissionError;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Entities Import Template");

  const baseColumns = [
    { header: "entity_type", width: 30 },
    { header: "name", width: 30 },
    { header: "pan", width: 20 },
    { header: "email", width: 30 },
    { header: "primary_phone", width: 18 },
    { header: "contact_person", width: 25 },
    { header: "secondary_phone", width: 18 },
    { header: "address_line1", width: 30 },
    { header: "address_line2", width: 30 },
    { header: "city", width: 20 },
    { header: "state", width: 20 },
    { header: "pincode", width: 12 },

    { header: "status", width: 12 },
  ];

  const customColumns = [];

  for (let i = 1; i <= 10; i++) {
    const n = String(i).padStart(2, "0");
    customColumns.push(
      { header: `custom_field_${n}`, width: 25 },
      { header: `custom_field_value_${n}`, width: 30 }
    );
  }

  sheet.columns = [...baseColumns, ...customColumns];

  // Add example row
  sheet.addRow({
    entity_type: "PRIVATE_LIMITED_COMPANY",
    name: "Acme Pvt Ltd",
    pan: "ABCDE1234F",
    email: "info@acme.com",
    primary_phone: "9876543210",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",

    status: "ACTIVE",
    custom_field_01: "GST Number",
    custom_field_value_01: "29ABCDE1234F1Z5",
    custom_field_02: "Website",
    custom_field_value_02: "https://acme.com",
  });

  // Style header row
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Add data validation for entity_type (column A)
  // Apply to rows 2-501 (500 data rows)
  for (let row = 2; row <= 501; row++) {
    sheet.getCell(`A${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`"${ENTITY_TYPES.join(",")}"`],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Invalid Entity Type",
      error: "Please select a valid entity type from the dropdown",
      showInputMessage: true,
      promptTitle: "Entity Type",
      prompt: "Select the type of entity",
    };
  }

  // Add data validation for status (column M - 14th column)
  for (let row = 2; row <= 501; row++) {
  sheet.getCell(`M${row}`).dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`"${STATUS_OPTIONS.join(",")}"`],
    showErrorMessage: true,
    errorStyle: "error",
    errorTitle: "Invalid Status",
    error: "Please select ACTIVE, INACTIVE, or SUSPENDED",
    showInputMessage: true,
    promptTitle: "Status",
    prompt: "Select the entity status (default: ACTIVE)",
  };
}




  // Add data validation for custom field names (columns O, Q, S, U, W, Y, AA, AC, AE, AG)
  // These are the custom_field_01, custom_field_02, etc. columns
  const customFieldNameColumns = [
    "O", // custom_field_01
    "Q", // custom_field_02
    "S", // custom_field_03
    "U", // custom_field_04
    "W", // custom_field_05
    "Y", // custom_field_06
    "AA", // custom_field_07
    "AC", // custom_field_08
    "AE", // custom_field_09
    "AG", // custom_field_10
  ];

  customFieldNameColumns.forEach((col) => {
    for (let row = 2; row <= 501; row++) {
      sheet.getCell(`${col}${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${PREDEFINED_FIELD_NAMES.join(",")}"`],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "Custom Field Name",
        error:
          "Please select from predefined names or choose 'Custom' to enter your own",
        showInputMessage: true,
        promptTitle: "Custom Field Name",
        prompt:
          "Select a predefined field name or 'Custom' to enter your own name",
      };
    }
  });

  // Add instructions sheet
  const instructionsSheet = workbook.addWorksheet("Instructions");
  instructionsSheet.columns = [{ width: 80 }];

  const instructions = [
    ["ENTITY IMPORT TEMPLATE - INSTRUCTIONS"],
    [""],
    ["REQUIRED FIELDS:"],
    ["• entity_type: Select from dropdown (required)"],
    ["• name: Entity name (required)"],
    ["• email: Valid email address (required)"],
    ["• primary_phone: 10-digit phone number (required)"],
    [""],
    ["OPTIONAL FIELDS:"],
    [
      "• pan: PAN number (format: ABCDE1234F) - Required for all entity types except UN_REGISTRED",
    ],
    ["• contact_person: Name of contact person"],
    ["• secondary_phone: Alternative phone number"],
    ["• address_line1, address_line2: Address details"],
    ["• city: City name"],
    ["• state: State name"],
    ["• pincode: 6-digit pincode"],
    ["• status: Select from dropdown (default: ACTIVE)"],
    [""],
    ["CUSTOM FIELDS:"],
    ["• You can add up to 10 custom fields per entity"],
    ["• For each custom field, provide both:"],
    [
      "  - custom_field_XX: Select predefined name or 'Custom' to enter your own",
    ],
    ["  - custom_field_value_XX: The value for that field"],
    ["• Predefined field names:"],
    ["  - GST Number"],
    ["  - TAN Number"],
    ["  - CIN Number"],
    ["  - Website"],
    ["  - Client Code"],
    ["  - Preferred Language"],
    ["  - Custom (allows you to enter any field name)"],
    [""],
    ["ENTITY TYPES:"],
    ...ENTITY_TYPES.map((type) => [`• ${type}`]),
    [""],
    ["STATUS OPTIONS:"],
    ...STATUS_OPTIONS.map((status) => [`• ${status}`]),
    [""],
    ["IMPORTANT NOTES:"],
    ["• Maximum 500 rows per import"],
    ["• File size limit: 5MB"],
    [
      "• PAN format must be: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)",
    ],
    ["• Phone numbers should be 10 digits"],
    ["• Email must be valid format"],
    [
      "• If you select 'Custom' for a custom field name, you can type any name you want",
    ],
    ["• Leave custom field name empty if you don't want to use that field"],
    [""],
    ["EXAMPLE:"],
    ["See the 'Entities Import Template' sheet for a sample row"],
  ];

  instructions.forEach((row, index) => {
    instructionsSheet.addRow(row);
    const cell = instructionsSheet.getCell(`A${index + 1}`);

    if (index === 0) {
      // Title
      cell.font = { bold: true, size: 14 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    } else if (
      row[0]?.includes("REQUIRED") ||
      row[0]?.includes("OPTIONAL") ||
      row[0]?.includes("CUSTOM FIELDS") ||
      row[0]?.includes("ENTITY TYPES") ||
      row[0]?.includes("STATUS OPTIONS") ||
      row[0]?.includes("IMPORTANT NOTES") ||
      row[0]?.includes("EXAMPLE")
    ) {
      // Section headers
      cell.font = { bold: true, size: 12 };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="entity-import-template.xlsx"',
    },
  });
}
