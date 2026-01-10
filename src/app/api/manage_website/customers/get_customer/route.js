import admin from "@/lib/firebase-admin";
import { z } from "zod";
import {   createSuccessResponse,
  createErrorResponse, } from "@/utils/server/apiResponse";

const db = admin.firestore();

// ✅ Zod schema for request body
const SearchSchema = z.object({
  searchValue: z.string().min(1, "Search value is required"),
});

// ✅ Regex patterns
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{7,15}$/; // supports international format

export async function POST(req) {
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

    const { searchValue } = parse.data;
    let field;

    if (emailRegex.test(searchValue)) {
      field = "email";
    } else if (phoneRegex.test(searchValue)) {
      field = "phoneNumber";
    }

    // ❌ Neither email nor phone format matched
    if (!field) {
      return createErrorResponse(
        "Invalid search value. Must be a valid email or phone number.",
        400,
        "INVALID_SEARCH_VALUE"
      );
    }

    // 🔥 Firestore query
    const snapshot = await db
      .collection("users")
      .where(field, "==", searchValue)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return createErrorResponse(
        "Customer not found",
        404,
        "CUSTOMER_NOT_FOUND"
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // ✅ Explicit object mapping
    const customer = {
      uid: data.uid,
      accountStatus: data.accountStatus,
      address: {
        city: data.address.city,
        street: data.address.street,
        state: data.address.state,
        pincode: data.address.pincode,
        country: data.address.country,
      },
      alternatePhone: data.alternatePhone,
      dob: data.dob,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
    };

    return createSuccessResponse(
      "Customer retrieved successfully",
      customer
    );
  } catch (err) {
    console.error("Search customer API error:", err);
    return createErrorResponse(
      "Internal server error",
      500,
      "SERVER_ERROR",
      process.env.NODE_ENV === "development" ? { stack: err.stack } : null
    );
  }
}
