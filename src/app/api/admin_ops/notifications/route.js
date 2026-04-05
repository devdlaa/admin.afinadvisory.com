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

    const { searchParams } = new URL(request.url);

    const limit = Math.min(Number(searchParams.get("limit")) || 10, 15);
    const cursor = searchParams.get("cursor");
    const tab = searchParams.get("tab") || "all";

    const userNotifRef = db.collection("notifications").doc(admin_user.id);

    let ref = userNotifRef.collection("items");

    if (tab === "mentions") {
      ref = ref.where("is_mention", "==", true).where("unread", "==", true);
    } else if (tab === "unread") {
      ref = ref.where("is_mention", "==", false).where("unread", "==", true);
    }

    ref = ref.orderBy("created_at", "desc").limit(limit);

    if (cursor) {
      const cursorTimestamp = admin.firestore.Timestamp.fromMillis(
        parseInt(cursor),
      );
      ref = ref.startAfter(cursorTimestamp);
    }

    const [snapshot, metadataDoc] = await Promise.all([
      ref.get(),
      userNotifRef.get(),
    ]);

    const items = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      items.push({
        ...data,
        id: doc.id,
        created_at: data.created_at
          ? data.created_at.toDate().toISOString()
          : null,
        read_at: data.read_at ? new Date(data.read_at).toISOString() : null,
      });
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    const nextCursor = lastDoc
      ? lastDoc.data().created_at?.toMillis?.() || null
      : null;

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
