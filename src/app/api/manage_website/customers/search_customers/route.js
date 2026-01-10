import admin from "@/lib/firebase-admin";
import { z } from "zod";
import {   createSuccessResponse,
  createErrorResponse, } from "@/utils/server/apiResponse";

const db = admin.firestore();

// ✅ Zod schema for input validation
const SearchSchema = z.object({
  value: z.string().min(1, "Search value is required"),
});

// ✅ Detects what field to search on
function detectField(value) {
  if (/^\+?\d{7,15}$/.test(value)) return "phoneNumber"; // phone number
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email"; // email
  if (/^[A-Za-z0-9_-]{10,}$/i.test(value)) return "uid"; // Firestore doc id
  return null; // unsupported format
}

export async function POST(req) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const parse = SearchSchema.safeParse(body);

    // 🔎 Validation error
    if (!parse.success) {
      return createErrorResponse(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        parse.error.flatten()
      );
    }

    let { value } = parse.data;
    const matchedField = detectField(value);

    // ❌ Unsupported search format
    if (!matchedField) {
      return createErrorResponse(
        "Unsupported search format",
        400,
        "INVALID_SEARCH_FORMAT"
      );
    }

    let customers = [];

    if (matchedField === "uid") {
      const doc = await db.collection("users").doc(value).get();
      if (doc.exists) customers.push({ id: doc.id, ...doc.data() });
    } else if (matchedField === "email") {
      value = value.toLowerCase(); // normalize email
      const snap = await db
        .collection("users")
        .where("email", "==", value)
        .get();
      customers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (matchedField === "phoneNumber") {
      const snap = await db
        .collection("users")
        .where("phoneNumber", "==", value)
        .get();
      customers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const executionTimeMs = Date.now() - startTime;

    if (customers.length === 0) {
      return createErrorResponse(
        "No customers found for the given search value",
        404,
        "CUSTOMER_NOT_FOUND",
        { matchedField, queryValue: value }
      );
    }

    return createSuccessResponse(
      "Customer search successful",
      {
        matchedField,
        queryValue: value,
        resultsCount: customers.length,
        customers,
      },
      {
        executionTimeMs,
      }
    );
  } catch (err) {
    console.error("Search customers API error:", err);
    return createErrorResponse(
      "Internal server error",
      500,
      "SERVER_ERROR",
      process.env.NODE_ENV === "development" ? { stack: err.stack } : null
    );
  }
}
