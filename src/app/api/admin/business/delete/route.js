// app/api/businesses/[id]/route.js
import fadmin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

import { requirePermission } from "@/lib/requirePermission";

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse(
        "Unauthorized - Please login to continue",
        401,
        "AUTH_REQUIRED"
      );
    }

    const permissionCheck = await requirePermission(request, "business.manage");
    if (permissionCheck) return permissionCheck;

    const user = session.user;
    const { id } = params;

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

  

    // Check if already deleted
    if (existingBusiness.flags?.softDeleted) {
      return createErrorResponse(
        "Business is already deleted",
        400,
        "ALREADY_DELETED"
      );
    }

    const now = fadmin.firestore.Timestamp.now();

    // Soft delete
    await businessRef.update({
      "flags.softDeleted": true,
      "flags.deletedAt": now,
      "flags.deletedBy": user.userCode,
      updatedAt: now,
      lastUpdatedBy: user.userCode,
    });

    return createSuccessResponse("Business deleted successfully", {
      id,
      deletedAt: now,
      deletedBy: user.name,
    });
  } catch (error) {
    console.error("Error deleting business:", error);
    return createErrorResponse(
      error.message || "Failed to delete business",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}
