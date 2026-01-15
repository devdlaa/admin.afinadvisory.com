export function safeForFirestore(input) {
  return sanitize(input);
}

function sanitize(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const t = typeof value;

  if (t === "string" || t === "number" || t === "boolean") {
    return value;
  }

  if (t === "bigint") {
    return value.toString();
  }

  if (t === "function") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  // Prisma / Decimal.js
  if (
    typeof value === "object" &&
    value !== null &&
    (value?.constructor?.name === "Decimal" ||
      ("d" in value && "e" in value && "s" in value))
  ) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitize).filter((v) => v !== undefined);
  }

  if (typeof value === "object") {
    const out = {};
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;

      const sanitized = sanitize(value[key]);
      if (sanitized !== undefined) {
        out[key] = sanitized;
      }
    }
    return out;
  }

  return String(value);
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];
