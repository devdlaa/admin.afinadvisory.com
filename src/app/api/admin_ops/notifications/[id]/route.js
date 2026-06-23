import admin from "@/lib/firebase-admin";
import {
  createSuccessResponse,
  handleApiError,
  createErrorResponse,
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

    const data = doc.data();

    if (!data.unread) {
      return createSuccessResponse("Already marked as read");
    }

    const batch = db.batch();

    // 1. Update notification doc
    batch.update(ref, {
      unread: false,
      read_at: new Date().toISOString(),
    });

    // 2. Update meta counters
    const userRef = db.collection("notifications").doc(admin_user.id);

    const metaUpdate = {
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (data.is_mention) {
      metaUpdate.unread_mentions_count =
        admin.firestore.FieldValue.increment(-1);
    } else {
      metaUpdate.unread_count = admin.firestore.FieldValue.increment(-1);
    }

    batch.set(userRef, metaUpdate, { merge: true });

    await batch.commit();

    return createSuccessResponse("Notification marked as read");
  } catch (err) {
    return handleApiError(err);
  }
}
