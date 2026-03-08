import admin from "@/lib/firebase-admin";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

const db = admin.firestore();

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] =
      await requirePermission(request);
    if (permissionError) return permissionError;

    const { id } = await params;

    const ref = db
      .collection("notifications")
      .doc(admin_user.id)
      .collection("items")
      .doc(id);

    const doc = await ref.get();

    if (!doc.exists) {
      return createErrorResponse("Notification not found", 404, "NOT_FOUND");
    }

    await ref.update({
      unread: false,
      read_at: new Date().toISOString(),
    });

    return createSuccessResponse("Notification marked as read");
  } catch (err) {
    return handleApiError(err);
  }
}
