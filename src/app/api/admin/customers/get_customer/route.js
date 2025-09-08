import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Zod schema for request body
const SearchSchema = z.object({
  searchValue: z.string().min(1, "Search value is required"),
});

// Regex patterns
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{7,15}$/; // supports international format

export async function POST(req) {
  try {
    const body = await req.json();
    const parse = SearchSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { searchValue } = parse.data;

    let field;

    if (emailRegex.test(searchValue)) {
      field = "email";
    } else if (phoneRegex.test(searchValue)) {
      field = "phoneNumber";
    }

    if (!field) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid search value. Must be a valid email or phone number.",
        },
        { status: 400 }
      );
    }

    // Firestore query
    const snapshot = await db
      .collection("users")
      .where(field, "==", searchValue)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Explicit object mapping
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

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (err) {
    console.error("Search customer API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
