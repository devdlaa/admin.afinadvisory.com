"use client";

import {
  BarChart2,
  Headphones,
  Building2,
  Wrench,
  Truck,
  Code2,
  MessageSquare,
  Telescope,
  Shield,
  Banknote,
  Landmark,
  GraduationCap,
  Car,
  Settings,
  User,
  Gift,
  Heart,
  Home,
  Stethoscope,
  Workflow,
} from "lucide-react";

export const PIPLINE_ICON_MAP = {
  chart: BarChart2,
  support: Headphones,
  buildings: Building2,
  tools: Wrench,
  truck: Truck,
  code: Code2,
  message: MessageSquare,
  telescope: Telescope,
  shield: Shield,
  money: Banknote,
  bank: Landmark,
  education: GraduationCap,
  car: Car,
  settings: Settings,
  user: User,
  gift: Gift,
  heart: Heart,
  home: Home,
  medical: Stethoscope,
  workflow: Workflow,
};

export function truncateText(text, maxLength = 50) {
  if (!text || typeof text !== "string") return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function generateInfluencerUsername(email, phone) {
  // 1️⃣  Take the email name part (before @) and clean it
  const emailName = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "") // keep only allowed chars
    .slice(0, 20); // limit so we have room

  // 2️⃣  Take last 4 digits of phone
  const phoneTail = phone.replace(/\D/g, "").slice(-4);

  // 3️⃣  Add a random 3-char suffix to reduce collisions
  const randomSuffix = Math.random()
    .toString(36)
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 3);

  // 4️⃣  Compose and trim to meet length requirements
  let username = `${emailName}_${phoneTail}_${randomSuffix}`
    .replace(/[^a-zA-Z0-9_]/g, "") // final clean
    .slice(0, 50);

  // 5️⃣  Ensure minimum length (pad if somehow too short)
  if (username.length < 3) {
    username = (username + "_user").slice(0, 50);
  }

  return username;
}

export const INDIAN_STATES = [
  "ANDHRA_PRADESH",
  "ARUNACHAL_PRADESH",
  "ASSAM",
  "BIHAR",
  "CHHATTISGARH",
  "GOA",
  "GUJARAT",
  "HARYANA",
  "HIMACHAL_PRADESH",
  "JHARKHAND",
  "KARNATAKA",
  "KERALA",
  "MADHYA_PRADESH",
  "MAHARASHTRA",
  "MANIPUR",
  "MEGHALAYA",
  "MIZORAM",
  "NAGALAND",
  "ODISHA",
  "PUNJAB",
  "RAJASTHAN",
  "SIKKIM",
  "TAMIL_NADU",
  "TELANGANA",
  "TRIPURA",
  "UTTAR_PRADESH",
  "UTTARAKHAND",
  "WEST_BENGAL",
  "ANDAMAN_AND_NICOBAR",
  "CHANDIGARH",
  "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU",
  "DELHI",
  "JAMMU_AND_KASHMIR",
  "LADAKH",
  "LAKSHADWEEP",
  "PUDUCHERRY",
];

export const formatCurrency = (amount) => {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function removeEmptyFields(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => removeEmptyFields(item))
      .filter(
        (item) =>
          item !== undefined &&
          item !== null &&
          (typeof item !== "object" || Object.keys(item).length > 0),
      );
  } else if (input !== null && typeof input === "object") {
    const cleaned = {};
    for (const key in input) {
      if (!input.hasOwnProperty(key)) continue;
      const value = input[key];
      if (value === undefined || value === null || value === "") continue;

      if (typeof value === "object") {
        const nested = removeEmptyFields(value);
        if (
          nested !== undefined &&
          nested !== null &&
          (typeof nested !== "object" || Object.keys(nested).length > 0)
        ) {
          cleaned[key] = nested;
        }
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  // Primitive value (non-empty) → return as is
  return input;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function isValidPhone(phone) {
  return phone.trim().length >= 7;
}

export const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
};

export const getFinancialYearOptions = ({
  yearsBack = 6,
  includeCurrent = true,
} = {}) => {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: yearsBack }, (_, i) => {
    const year = currentYear - i;

    return {
      value: year.toString(),
      label: `1 Apr ${String(year).slice(2)} - 31 Mar ${String(year + 1).slice(2)}`,
    };
  });
};
