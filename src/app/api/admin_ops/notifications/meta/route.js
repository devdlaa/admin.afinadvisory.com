import admin from "@/lib/firebase-admin";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

const db = admin.firestore();
export async function GET(request) {
  try {
    const [permissionError, session, admin_user] =
      await requirePermission(request);
    if (permissionError) return permissionError;

    const doc = await db.collection("notifications").doc(admin_user.id).get();

    if (!doc.exists) {
      return createSuccessResponse("No notifications", {
        unread_count: 0,
        unread_mentions_count: 0,
        last_unread_at: null,
        last_mention_at: null,
      });
    }

    const data = doc.data();

    return createSuccessResponse("Notification meta", {
      unread_count: data.unread_count || 0,
      unread_mentions_count: data.unread_mentions_count || 0,
      last_unread_at: data.last_unread_at
        ? data.last_unread_at.toDate().toISOString()
        : null,

      last_mention_at: data.last_mention_at
        ? data.last_mention_at.toDate().toISOString()
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
