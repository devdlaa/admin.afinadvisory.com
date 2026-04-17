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

function buildFirestoreCursor(value) {
  if (!value) return null;

  // Firestore Timestamp object
  if (typeof value.toDate === "function") return value;

  // Firestore Timestamp-like { seconds, nanoseconds }
  if (value?.seconds) {
    return admin.firestore.Timestamp.fromMillis(value.seconds * 1000);
  }

  // ISO string (new format)
  if (typeof value === "string") return value;

  return null;
}

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] =
      await requirePermission(request);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const limit = Math.min(Number(searchParams.get("limit")) || 10, 15);
    const cursor = searchParams.get("cursor"); // timestamp in ms
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
      const cursorMs = Number(cursor);
      const cursorDate = new Date(cursorMs);

      // Fetch the actual cursor doc to get its raw created_at
      // so we can match the type Firestore stored (Timestamp vs string)
      const cursorSnap = await userNotifRef
        .collection("items")
        .where("created_at", "in", [
          admin.firestore.Timestamp.fromDate(cursorDate),
          cursorDate.toISOString(),
        ])
        .limit(1)
        .get();

      if (!cursorSnap.empty) {
        const rawCreatedAt = cursorSnap.docs[0].data().created_at;
        const firestoreCursor = buildFirestoreCursor(rawCreatedAt);
        if (firestoreCursor) {
          ref = ref.startAfter(firestoreCursor);
        }
      } else {
        // Fallback: try both types — first Timestamp, then ISO string
        // This handles edge cases where the exact doc isn't found
        const cursorTimestamp = admin.firestore.Timestamp.fromDate(cursorDate);
        ref = ref.startAfter(cursorTimestamp);
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

    const nextCursor = lastDoc ? getCursor(lastDoc.data().created_at) : null;

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
