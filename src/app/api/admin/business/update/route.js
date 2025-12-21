// app/api/businesses/[id]/route.js
import fadmin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
import { BusinessUpdateSchema } from "@/app/schemas/BusinessSchema";
import { requirePermission } from "@/lib/requirePermission";

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse(
        "Unauthorized - Please login to continue",
        401,
        "AUTH_REQUIRED"
      );
    }

  
    const permissionCheck = await requirePermission(req, "business.manage");
    if (permissionCheck) return permissionCheck;

    const user = session.user;
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return createErrorResponse(
        "Business ID is required",
        400,
        "MISSING_BUSINESS_ID"
      );
    }

    const db = fadmin.firestore();
    const businessRef = db.collection("businesses").doc(id);
    const businessDoc = await businessRef.get();

    if (!businessDoc.exists) {
      return createErrorResponse(
        "Business not found",
        404,
        "BUSINESS_NOT_FOUND"
      );
    }

    const existingBusiness = businessDoc.data();

    

    // Check if business is deleted
    if (existingBusiness.flags?.softDeleted) {
      return createErrorResponse(
        "Cannot update a deleted business",
        400,
        "BUSINESS_DELETED"
      );
    }

    const now = fadmin.firestore.Timestamp.now();

    // Prepare update data
    const updateData = {
      ...body,
      id,
      updatedAt: now,
      lastUpdatedBy: user.userCode,
    };

    // Validate with Zod
    const validation = BusinessUpdateSchema.safeParse(updateData);
    if (!validation.success) {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        validation.error.errors
      );
    }

    // Update Firestore
    await businessRef.update(validation.data);

    const updatedBusiness = {
      id,
      ...existingBusiness,
      ...validation.data,
    };

    return createSuccessResponse(
      "Business updated successfully",
      updatedBusiness
    );
  } catch (error) {
    console.error("Error updating business:", error);
    return createErrorResponse(
      error.message || "Failed to update business",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}



