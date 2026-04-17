import admin from "@/lib/firebase-admin";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

const db = admin.firestore();

function normalizeDate(value) {
  if (!value) return null;

  try {
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }

    if (value?.seconds) {
      return new Date(value.seconds * 1000).toISOString();
    }

    const parsed = new Date(value);

    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return null;
  } catch {
    return null;
  }
}

function getCursor(value) {
  if (!value) return null;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value?.seconds) {
    return value.seconds * 1000;
  }

  const parsed = new Date(value);
  return !isNaN(parsed.getTime()) ? parsed.getTime() : null;
}

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
      const cursorDoc = await userNotifRef
        .collection("items")
        .doc(cursor)
        .get();

      if (cursorDoc.exists) {
        ref = ref.startAfter(cursorDoc);
      }
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
        created_at: normalizeDate(data.created_at),
        read_at: normalizeDate(data.read_at),
      });
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    const nextCursor = lastDoc ? lastDoc.id : null;

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
