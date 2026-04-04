import admin from "@/lib/firebase-admin";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";



const db = admin.firestore();

// GET - List notifications
// GET - List notifications
export async function GET(request) {
  try {
    const [permissionError, session] = await requirePermission(request);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const cursor = searchParams.get("cursor");
    const onlyUnread = searchParams.get("unread") === "true";

    const userNotifRef = db.collection("notifications").doc(session.user.id);

    let ref = userNotifRef
      .collection("items")
      .orderBy("created_at", "desc")
      .limit(limit);

    if (onlyUnread) {
      ref = ref.where("unread", "==", true);
    }

    if (cursor) {
      // Use timestamp cursor instead of document ID
      const cursorTimestamp = admin.firestore.Timestamp.fromMillis(
        parseInt(cursor)
      );
      ref = ref.startAfter(cursorTimestamp);
    }

    // Fetch notifications and metadata in parallel
    const [snapshot, metadataDoc] = await Promise.all([
      ref.get(),
      userNotifRef.get(),
    ]);

    const items = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({ ...data, id: doc.id });
    });

    // Use cursor as timestamp instead of ID
    const nextCursor =
      items.length > 0
        ? items[items.length - 1].created_at?.toMillis?.() || null
        : null;

    // Get unread count from metadata document
    const unreadCount = metadataDoc.exists
      ? metadataDoc.data()?.unread_count || 0
      : 0;

    return createSuccessResponse("Notifications retrieved", {
      items,
      next_cursor: nextCursor,
      unread_count: unreadCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
