// app/api/chat/firebase-token/route.js
import admin from "@/lib/firebase-admin";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

/**
 * Generate Firebase custom token for authenticated user
 * POST /api/chat/firebase-token
 */
export async function POST(req) {
  try {
    // Verify user is authenticated in your Postgres system
    const [permissionError, session, admin_user] = await requirePermission(req);
    if (permissionError) return permissionError;

    // Generate Firebase custom token using user's Postgres ID
    const customToken = await admin.auth().createCustomToken(admin_user.id, {
      email: admin_user.email,
      name: admin_user.name,
      role: admin_user.admin_role,
    });

    return createSuccessResponse("Firebase token generated successfully", {
      token: customToken,
      userId: admin_user.id,
    });
  } catch (error) {
    console.error("Firebase token generation error:", error);
    return handleApiError(error);
  }
}
