"use client";
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

export const formatCurrency = (amount) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

export function removeEmptyFields(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => removeEmptyFields(item))
      .filter(
        (item) =>
          item !== undefined &&
          item !== null &&
          (typeof item !== "object" || Object.keys(item).length > 0)
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
