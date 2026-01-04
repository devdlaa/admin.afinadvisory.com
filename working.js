const REGISTRATION_TYPES = [
  "GSTIN_REGISTRATION",
  "PAN_REGISTRATION",
  "TAN_REGISTRATION",
  "CIN_COMPANY_REGISTRATION",
  "LLPIN_LLP_REGISTRATION",
  "IEC_IMPORT_EXPORT_CODE",
  "ESI_REGISTRATION",
  "EPF_REGISTRATION",
  "PROFESSIONAL_TAX_REGISTRATION",
  "SHOP_ESTABLISHMENT_REGISTRATION",
  "FSSAI_LICENSE",
  "STARTUP_DPIIT_RECOGNITION",
  "DIN_DIRECTOR_IDENTIFICATION_NUMBER",
  "TRUST_OR_SOCIETY_REGISTRATION",
  "SEZ_OR_EOU_REGISTRATION",
  "COOPERATIVE_SOCIETY_REGISTRATION",
  "LABOUR_WELFARE_FUND_REGISTRATION",
  "POLLUTION_CONTROL_BOARD_CONSENT",
  "IMPORTER_EXPORTER_MEMBERSHIP_CERTIFICATE",
  "TRADE_LICENSE",
  "FACTORY_LICENSE",
  "BOCW_REGISTRATION",
  "MSME_UDYAM_REGISTRATION",
];

const GSTIN_REGISTRATION = [
  ({
    code: "GSTR_3B_MONTHLY",
    name: "GSTR-3B Monthly Return",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "MONTHLY",
    due_day: 20,
    grace_days: 0,
  },
  {
    code: "GSTR_3B_QRMP",
    name: "GSTR-3B Quarterly (QRMP Scheme)",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "QUARTERLY",
    anchor_months: [3, 6, 9, 12],
    due_day: 22,
    period_label_type: "QUARTER",
    grace_days: 2,
  },
  {
    code: "GSTR_1_MONTHLY",
    name: "GSTR-1 Monthly Return",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "MONTHLY",

    due_day: 11,

    grace_days: 0,
  },
  {
    code: "GSTR_1_QRMP",
    name: "GSTR-1 Quarterly (QRMP Scheme)",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "QUARTERLY",

    due_day: 13,

    grace_days: 0,
  },
  {
    code: "CMP_08_QUARTERLY",
    name: "CMP-08 Quarterly Composition Scheme Payment",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "QUARTERLY",

    due_day: 18,

    grace_days: 0,
  },
  {
    code: "GSTR_5_MONTHLY",
    name: "GSTR-5 Non-Resident Taxable Person Return",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "MONTHLY",

    due_day: 20,

    grace_days: 0,
  },
  {
    code: "GSTR_6_MONTHLY",
    name: "GSTR-6 Input Service Distributor Return",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "MONTHLY",

    due_day: 13,

    grace_days: 0,
  },
  {
    code: "GSTR_7_MONTHLY",
    name: "GSTR-7 GST TDS Return",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "MONTHLY",

    due_day: 10,

    grace_days: 0,
  },
  {
    code: "GSTR_8_MONTHLY",
    name: "GSTR-8 GST TCS (E-Commerce) Return",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "MONTHLY",

    due_day: 10,

    grace_days: 0,
  },
  {
    code: "GSTR_9_ANNUAL",
    name: "GSTR-9 Annual Return",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "YEARLY",

    due_day: 31,
    due_month_offset: 9,

    grace_days: 0,
  },
  {
    code: "GSTR_9C_ANNUAL",
    name: "GSTR-9C Annual Reconciliation Statement",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "YEARLY",

    due_day: 31,
    due_month_offset: 9,

    grace_days: 0,
  },
  {
    code: "ITC_04_HALF_YEARLY",
    name: "ITC-04 Job Work / Goods sent out on job work",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "HALF_YEARLY",

    due_day: 25,

    grace_days: 0,
  },
  {
    code: "GSTR_4_YEARLY",
    name: "GSTR-4 Annual Return (Composition)",
    registration_type_code: "GSTIN_REGISTRATION",
    frequency_type: "YEARLY",

    due_day: 30,
    due_month_offset: 1,

    grace_days: 0,
  }),
];

const PAN_REGISTRATION = [
  {
    code: "ITR_NON_AUDIT",
    name: "Income Tax Return (Non-Audit Case)",
    registration_type_code: "PAN_REGISTRATION",
    frequency_type: "YEARLY",
    due_day: 31,
    due_month_offset: 4,
    grace_days: 0,
  },
  {
    code: "ITR_AUDIT",
    name: "Income Tax Return (Audit Case)",
    registration_type_code: "PAN_REGISTRATION",
    frequency_type: "YEARLY",
    due_day: 31,
    due_month_offset: 7,
    grace_days: 0,
  },
  {
    code: "ADVANCE_TAX_NON_PRESUMPTIVE",
    name: "Advance Tax Installments (Non-Presumptive)",
    registration_type_code: "PAN_REGISTRATION",
    frequency_type: "QUARTERLY",
    due_day: 15,
    due_month_offset: 0,
    grace_days: 0,
  },
  {
    code: "ADVANCE_TAX_PRESUMPTIVE_44AD_44ADA",
    name: "Advance Tax (Presumptive 44AD/44ADA Single Installment)",
    registration_type_code: "PAN_REGISTRATION",
    frequency_type: "YEARLY",
    due_day: 15,
    due_month_offset: 0,
    grace_days: 0,
  },
];

const TAN_REGISTRATION = [
  {
    compliance_code: "TDS_PAYMENT_MONTHLY",
    name: "Monthly TDS Payment",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "MONTHLY",
    due_day: 7,
    due_month_offset: 1,
    grace_days: 0,
  },
  {
    compliance_code: "TCS_PAYMENT_MONTHLY",
    name: "Monthly TCS Payment",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "MONTHLY",
    due_day: 7,
    due_month_offset: 1,
    grace_days: 0,
  },
  {
    compliance_code: "TDS_RETURN_24Q",
    name: "TDS Return 24Q (Salary)",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "QUARTERLY",
    due_day: 31,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: {
      3: { due_day: 31, due_month_offset: 2 },
    },
  },
  {
    compliance_code: "TDS_RETURN_26Q",
    name: "TDS Return 26Q (Non-salary)",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "QUARTERLY",
    due_day: 31,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: {
      3: { due_day: 31, due_month_offset: 2 },
    },
  },
  {
    compliance_code: "TDS_RETURN_27Q",
    name: "TDS Return 27Q (Non-resident)",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "QUARTERLY",
    due_day: 31,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: {
      3: { due_day: 31, due_month_offset: 2 },
    },
  },
  {
    compliance_code: "TCS_RETURN_27EQ",
    name: "TCS Return 27EQ",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "QUARTERLY",
    due_day: 31,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: {
      3: { due_day: 31, due_month_offset: 2 },
    },
  },
  {
    compliance_code: "FORM_16_ANNUAL",
    name: "Form 16 Certificate to Employees",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "YEARLY",
    due_day: 15,
    due_month_offset: 2,
    grace_days: 0,
    anchor_overrides: null,
  },
  {
    compliance_code: "FORM_24G_GOVT_DEDUCTORS_MONTHLY",
    name: "Form 24G (Government Deductors)",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "MONTHLY",
    due_day: 15,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
  },
  {
    compliance_code: "FORM_15G_15H_STATEMENT",
    name: "Form 15G/15H Statement",
    registration_type_code: "TAN_REGISTRATION",
    frequency_type: "QUARTERLY",
    due_day: 15,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
  },
];

const CIN_COMPANY_REGISTRATION = [
  {
    compliance_code: "AOC_4_ANNUAL",
    name: "AOC-4 Filing of Financial Statements",
    registration_type_code: "CIN_COMPANY_REGISTRATION",
    frequency_type: "YEARLY",
    anchor_months: [3],
    period_label_type: "FINANCIAL_YEAR",
    due_day: 30,
    due_month_offset: 7,
    grace_days: 0,
    anchor_overrides: null,
  },
  {
    compliance_code: "MGT_7_ANNUAL_RETURN",
    name: "MGT-7 Annual Return",
    registration_type_code: "CIN_COMPANY_REGISTRATION",
    frequency_type: "YEARLY",
    anchor_months: [3],
    period_label_type: "FINANCIAL_YEAR",
    due_day: 29,
    due_month_offset: 8,
    grace_days: 0,
    anchor_overrides: null,
  },
];

const LLPIN_LLP_REGISTRATION = [
  {
    compliance_code: "LLP_FORM_11_ANNUAL_RETURN",
    name: "LLP Form 11 Annual Return",
    registration_type_code: "LLPIN_LLP_REGISTRATION",
    frequency_type: "YEARLY",
    anchor_months: [3],
    period_label_type: "FINANCIAL_YEAR",
    due_day: 30,
    due_month_offset: 2,
    grace_days: 0,
    anchor_overrides: null,
  },
  {
    compliance_code: "LLP_FORM_8_STATEMENT_OF_ACCOUNTS",
    name: "LLP Form 8 Statement of Account and Solvency",
    registration_type_code: "LLPIN_LLP_REGISTRATION",
    frequency_type: "YEARLY",
    anchor_months: [3],
    period_label_type: "FINANCIAL_YEAR",
    due_day: 30,
    due_month_offset: 7,
    grace_days: 0,
    anchor_overrides: null,
  },
];

const IEC_IMPORT_EXPORT_CODE = [
  {
    compliance_code: "IEC_ANNUAL_CONFIRMATION",
    name: "IEC Annual Confirmation / Updation with DGFT",
    registration_type_code: "IEC_IMPORT_EXPORT_CODE",
    frequency_type: "YEARLY",
    anchor_months: [3],
    period_label_type: "FINANCIAL_YEAR",
    due_day: 30,
    due_month_offset: 3,
    grace_days: 0,
    anchor_overrides: null,
  },
];

const ESI_REGISTRATION = [
  {
    compliance_code: "ESI_MONTHLY_CONTRIBUTION",
    name: "ESI Monthly Contribution Filing and Payment",
    registration_type_code: "ESI_REGISTRATION",
    frequency_type: "MONTHLY",
    due_day: 15,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
  },
];

const EPF_REGISTRATION = [
  {
    compliance_code: "EPF_MONTHLY_ECR_RETURN",
    name: "EPF Monthly ECR Filing and Payment",
    registration_type_code: "EPF_REGISTRATION",
    frequency_type: "MONTHLY",
    due_day: 15,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
  },
  {
    compliance_code: "EPF_ANNUAL_RETURN",
    name: "EPF Annual Return / Reconciliation",
    registration_type_code: "EPF_REGISTRATION",
    frequency_type: "YEARLY",
    due_day: 30,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
  },
];

const PROFESSIONAL_TAX_REGISTRATION = [
  {
    compliance_code: "PT_PTRC_EMPLOYEE_TAX",
    name: "Professional Tax – PTRC (Employee Tax Payment/Return)",
    registration_type_code: "PROFESSIONAL_TAX_REGISTRATION",
    frequency_type: "MONTHLY",
    due_day: 15,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
  },
  {
    compliance_code: "PT_PTEC_SELF_EMPLOYMENT_TAX",
    name: "Professional Tax – PTEC (Enrollment Tax)",
    registration_type_code: "PROFESSIONAL_TAX_REGISTRATION",
    frequency_type: "YEARLY",
    due_day: 31,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
  },
];

const FSSAI_LICENSE = [
  {
    compliance_code: "FSSAI_ANNUAL_RETURN_D1",
    name: "FSSAI Annual Return (Form D-1)",
    registration_type_code: "FSSAI_LICENSE",
    frequency_type: "YEARLY",
    due_day: 31,
    due_month_offset: 2,
    grace_days: 0,
    anchor_overrides: null,
  },
  {
    compliance_code: "FSSAI_LICENSE_RENEWAL",
    name: "FSSAI License Renewal",
    registration_type_code: "FSSAI_LICENSE",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 120,
    post_expiry_grace_days: 60,
  },
];

const DIN_DIRECTOR_IDENTIFICATION_NUMBER = [
  {
    compliance_code: "DIN_ANNUAL_KYC_DIR3",
    name: "DIN Annual KYC (DIR-3 KYC)",
    registration_type_code: "DIN_DIRECTOR_IDENTIFICATION_NUMBER",
    frequency_type: "YEARLY",
    due_day: 30,
    due_month_offset: 6,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: true,
  },
];

const TRUST_OR_SOCIETY_REGISTRATION = [
  {
    compliance_code: "TRUST_SOCIETY_REGISTRATION_RENEWAL",
    name: "Trust/Society Registration Renewal",
    registration_type_code: "TRUST_OR_SOCIETY_REGISTRATION",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 90,
    post_expiry_grace_days: 30,
  },
];

const COOPERATIVE_SOCIETY_REGISTRATION = [
  {
    compliance_code: "COOP_SOCIETY_REGISTRATION_RENEWAL",
    name: "Co-operative Society Registration Renewal",
    registration_type_code: "COOPERATIVE_SOCIETY_REGISTRATION",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 90,
    post_expiry_grace_days: 30,
  },
];

const LABOUR_WELFARE_FUND_REGISTRATION = [
  {
    compliance_code: "LWF_REGISTRATION_RENEWAL",
    name: "Labour Welfare Fund Registration Renewal",
    registration_type_code: "LABOUR_WELFARE_FUND_REGISTRATION",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 60,
    post_expiry_grace_days: 30,
  },
];

const POLLUTION_CONTROL_BOARD_CONSENT = [
  {
    compliance_code: "PCB_CONSENT_RENEWAL",
    name: "Pollution Control Board Consent Renewal",
    registration_type_code: "POLLUTION_CONTROL_BOARD_CONSENT",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 120,
    post_expiry_grace_days: 60,
  },
];

const IMPORTER_EXPORTER_MEMBERSHIP_CERTIFICATE = [
  {
    compliance_code: "IEMC_MEMBERSHIP_RENEWAL",
    name: "Importer Exporter Membership Certificate Renewal",
    registration_type_code: "IMPORTER_EXPORTER_MEMBERSHIP_CERTIFICATE",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 90,
    post_expiry_grace_days: 30,
  },
];

const TRADE_LICENSE = [
  {
    compliance_code: "TRADE_LICENSE_RENEWAL",
    name: "Trade License Renewal",
    registration_type_code: "TRADE_LICENSE",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 30,
    post_expiry_grace_days: 30,
  },
];

const FACTORY_LICENSE = [
  {
    compliance_code: "FACTORY_LICENSE_RENEWAL",
    name: "Factory License Renewal",
    registration_type_code: "FACTORY_LICENSE",
    frequency_type: "EXPIRY_BASED",
    due_day: 0,
    due_month_offset: 0,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
    renewal_window_days_before_expiry: 120,
    post_expiry_grace_days: 60,
  },
];

const MSME_UDYAM_REGISTRATION = [
  {
    compliance_code: "UDYAM_PROFILE_UPDATE_REMINDER",
    name: "Udyam Registration – Profile Update / Reconfirmation Reminder",
    registration_type_code: "MSME_UDYAM_REGISTRATION",
    frequency_type: "YEARLY",
    anchor_months: [3],
    period_label_type: "FINANCIAL_YEAR",
    due_day: 30,
    due_month_offset: 1,
    grace_days: 0,
    anchor_overrides: null,
    auto_task_generation_enabled: false,
  },
];
