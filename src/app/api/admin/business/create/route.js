// app/api/businesses/route.js
import fadmin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
import { BusinessCreateSchema } from "@/app/schemas/BusinessSchema";
import { requirePermission } from "@/lib/requirePermission";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse(
        "Unauthorized - Please login to continue",
        401,
        "AUTH_REQUIRED"
      );
    }

    // Permission check - uncomment and configure based on your permission mapping
    const permissionCheck = await requirePermission(request, "business.manage");
    if (permissionCheck) return permissionCheck;

    const user = session.user;
    const body = await request.json();

    const { name, email, phone, gstin, billingEnabled } = body;

    // Validate required fields
    if (!name || !email || !phone) {
      return createErrorResponse(
        "Missing required fields: name, email, and phone are required",
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }

    const now = fadmin.firestore.Timestamp.now();
    const db = fadmin.firestore();

    // Check if business with same email already exists
    const existingBusiness = await db
      .collection("businesses")
      .where("email", "==", email)
      .where("flags.softDeleted", "==", false)
      .limit(1)
      .get();

    if (!existingBusiness.empty) {
      return createErrorResponse(
        "Business with this email already exists",
        409,
        "BUSINESS_EXISTS"
      );
    }

    // Build business object
    const businessData = {
      name,
      email,
      phone,
      gstin: gstin || null,
      billingEnabled: billingEnabled || false,

      createdAt: now,
      updatedAt: now,
      createdBy: user.userCode,
      lastUpdatedBy: user.userCode,

      flags: {
        softDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    };

    // Validate with Zod
    const validation = BusinessCreateSchema.safeParse(businessData);
    if (!validation.success) {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        validation.error.errors
      );
    }

    // Save to Firestore
    const docRef = await db.collection("businesses").add(validation.data);

    const createdBusiness = {
      id: docRef.id,
      ...validation.data,
    };

    return createSuccessResponse(
      "Business created successfully",
      createdBusiness,
      { businessId: docRef.id }
    );
  } catch (error) {
    console.error("Error creating business:", error);
    return createErrorResponse(
      error.message || "Failed to create business",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}

