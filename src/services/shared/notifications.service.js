import admin from "@/lib/firebase-admin";

import { prisma } from "@/utils/server/db";
import { v4 as uuidv4 } from "uuid";

const db = admin.firestore();
const NOTIF_COLLECTION = "notifications";

export async function notify(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { success: 0, failed: 0 };
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return { success: 0, failed: 0 };
  }

  const now = new Date().toISOString();

  try {
    const BATCH_SIZE = 500;
    const batches = [];

    for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
      const batchUserIds = uniqueUserIds.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const userId of batchUserIds) {
        const notifId = uuidv4();

        const ref = db
          .collection(NOTIF_COLLECTION)
          .doc(userId)
          .collection("items")
          .doc(notifId);

        batch.set(ref, {
          id: notifId,
          user_id: userId,
          title: payload.title ?? null,
          body: payload.body ?? null,
          type: payload.type ?? "GENERAL",
          link: payload.link ?? null,
          task_id: payload.task_id ?? null,
          entity_id: payload.entity_id ?? null,
          comment_id: payload.comment_id ?? null,
          actor_id: payload.actor_id ?? null,
          actor_name: payload.actor_name ?? null,
          unread: true,
          created_at: now,
          read_at: null,
        });

        // ✅ INCREMENT unread_count in parent document
        const userRef = db.collection(NOTIF_COLLECTION).doc(userId);
        batch.set(
          userRef,
          {
            unread_count: admin.firestore.FieldValue.increment(1),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      batches.push(batch.commit());
    }

    await Promise.all(batches);

    const tokens = await prisma.userPushToken.findMany({
      where: {
        user_id: { in: uniqueUserIds },
      },
      select: { token: true, user_id: true, device: true },
    });

    if (tokens.length === 0) {
      return { success: uniqueUserIds.length, failed: 0, pushSent: 0 };
    }

    const FCM_BATCH_SIZE = 500;
    let pushSuccessCount = 0;
    let pushFailCount = 0;

    for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
      const batchTokens = tokens.slice(i, i + FCM_BATCH_SIZE);

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batchTokens.map((t) => t.token),
          notification: {
            title: payload.title ?? "Notification",
            body: payload.body ?? "",
          },
          data: {
            link: payload.link ?? "",
            task_id: payload.task_id ?? "",
            entity_id: payload.entity_id ?? "",
            comment_id: payload.comment_id ?? "",
            type: payload.type ?? "GENERAL",
          },
          android: {
            priority: "high",
          },
          apns: {
            headers: {
              "apns-priority": "10",
            },
          },
        });

        pushSuccessCount += response.successCount;
        pushFailCount += response.failureCount;

        if (response.failureCount > 0) {
          const invalidTokens = [];

          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const error = resp.error;
              if (
                error?.code === "messaging/invalid-registration-token" ||
                error?.code === "messaging/registration-token-not-registered"
              ) {
                invalidTokens.push(batchTokens[idx].token);
              }
            }
          });

          if (invalidTokens.length > 0) {
            await prisma.userPushToken.deleteMany({
              where: {
                token: { in: invalidTokens },
              },
            });
          }
        }
      } catch (pushError) {
        console.error("Push notification batch failed:", pushError);
        pushFailCount += batchTokens.length;
      }
    }

    return {
      success: uniqueUserIds.length,
      failed: 0,
      pushSent: pushSuccessCount,
      pushFailed: pushFailCount,
    };
  } catch (error) {
    console.error("Notification service error:", error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId) {
  const snapshot = await db
    .collection(NOTIF_COLLECTION)
    .doc(userId)
    .collection("items")
    .where("unread", "==", true)
    .get();

  const batch = db.batch();
  const now = new Date().toISOString();

  snapshot.forEach((doc) => {
    batch.update(doc.ref, {
      unread: false,
      read_at: now,
    });
  });

  // Always reset counter to 0
  const userRef = db.collection(NOTIF_COLLECTION).doc(userId);
  batch.set(
    userRef,
    {
      unread_count: 0,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
  return snapshot.size;
}

export async function deleteOldNotifications(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const snapshot = await db
    .collectionGroup("items")
    .where("created_at", "<", cutoffDate.toISOString())
    .limit(500)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.forEach((doc) => batch.delete(doc.ref));

  await batch.commit();
  return snapshot.size;
}
