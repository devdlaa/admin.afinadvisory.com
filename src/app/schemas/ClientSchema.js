// @/schemas/UserSchema.js
import { z } from "zod";

import { INDIAN_STATES } from "@/utils/server/utils";

// Base field validators (reusable)
const nameValidator = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name cannot exceed 50 characters")
  .regex(
    /^[a-zA-Z\s'-]+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes"
  )
  .trim();

const phoneValidator = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number cannot exceed 15 digits")
  .regex(/^[0-9]+$/, "Phone number can only contain digits")
  .trim();

const emailValidator = z
  .string()
  .email("Invalid email address")
  .max(254, "Email address too long")
  .toLowerCase()
  .trim();

const optionalEmailValidator = z
  .string()
  .email("Invalid email address")
  .max(254, "Email address too long")
  .toLowerCase()
  .trim()
  .optional()
  .or(z.literal(""));

const genderValidator = z
  .enum(["male", "female", "other", "prefer-not-to-say", ""])
  .optional()
  .default("");

const dobValidator = z
  .string()
  .refine((date) => {
    if (!date) return true;
    const parsedDate = new Date(date);
    const now = new Date();
    const minAge = new Date(
      now.getFullYear() - 120,
      now.getMonth(),
      now.getDate()
    );
    return parsedDate <= now && parsedDate >= minAge;
  }, "Invalid date of birth")
  .optional()
  .default("");

const alternatePhoneValidator = z
  .string()
  .refine((phone) => {
    if (!phone) return true;
    return /^[0-9]{10,15}$/.test(phone);
  }, "Alternate phone number must be 10-15 digits")
  .optional()
  .default("");

const addressValidator = z
  .object({
    street: z
      .string()
      .max(200, "Street address too long")
      .optional()
      .default(""),
    pincode: z
      .string()
      .refine((pin) => {
        if (!pin) return true;
        return /^[0-9]{4,10}$/.test(pin);
      }, "Pincode must be 4-10 digits")
      .optional()
      .default(""),
    state: z
      .string()
      .optional()
      .refine((val) => {
        if (!val) return true;
        return INDIAN_STATES.includes(val);
      }, "Invalid state. Please select a valid Indian state.")
      .default(""),
    city: z.string().max(50, "City name too long").optional().default(""),
    country: z.string().max(50, "Country name too long").optional().default(""),
  })
  .optional()
  .default({});

// Custom refinement for alternate phone validation
const alternatePhoneDifferentFromPrimary = (data) => {
  if (data.alternatePhone && data.alternatePhone === data.phoneNumber) {
    return false;
  }
  return true;
};

// Base user schema (shared fields)
const baseUserFields = {
  firstName: nameValidator,
  lastName: nameValidator,
  gender: genderValidator,
  dob: dobValidator,
  alternatePhone: alternatePhoneValidator,
  address: addressValidator,
};

// Schema 1: Email is MANDATORY (for main customer creation)
export const AddUserWithMandatoryEmailSchema = z
  .object({
    ...baseUserFields,
    email: emailValidator, // Mandatory
    phoneNumber: phoneValidator,
  })
  .refine(alternatePhoneDifferentFromPrimary, {
    message:
      "Alternate phone number must be different from primary phone number",
    path: ["alternatePhone"],
  });

// Schema 2: Email is OPTIONAL (for CRM user creation)
export const AddUserWithOptionalEmailSchema = z
  .object({
    ...baseUserFields,
    email: optionalEmailValidator, // Optional
    phoneNumber: phoneValidator,
  })
  .refine(alternatePhoneDifferentFromPrimary, {
    message:
      "Alternate phone number must be different from primary phone number",
    path: ["alternatePhone"],
  });

// Export individual validators if needed elsewhere
export const validators = {
  name: nameValidator,
  phone: phoneValidator,
  email: emailValidator,
  optionalEmail: optionalEmailValidator,
  gender: genderValidator,
  dob: dobValidator,
  alternatePhone: alternatePhoneValidator,
  address: addressValidator,
};

// Helper function to create custom user schemas
export const createUserSchema = (config = {}) => {
  const { emailRequired = true, customFields = {} } = config;

  return z
    .object({
      ...baseUserFields,
      email: emailRequired ? emailValidator : optionalEmailValidator,
      phoneNumber: phoneValidator,
      ...customFields,
    })
    .refine(alternatePhoneDifferentFromPrimary, {
      message:
        "Alternate phone number must be different from primary phone number",
      path: ["alternatePhone"],
    });
};
