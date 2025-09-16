import admin from "./firebase-admin";

import { Msg91Provider } from "./otpProviders/Msg91Provider";
import { TwilioProvider } from "./otpProviders/TwilioProvider";
import { helperRegistry } from "./helpers";

const db = admin.firestore();

// ✅ Choose provider based on ENV
let otpProvider;
if (process.env.NODE_ENV === "production") {
  otpProvider = new Msg91Provider();
} else {
  otpProvider = new TwilioProvider();
}

export async function initiateOtp({ uid,actionId = null, metaData = {} }) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpId = `otp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const phoneNumber = process.env.ADMIN_PHONE_NUMBER;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
  const userId = uid || metaData?.notes?.refund_by_user_id;

  await db.collection("otps").doc(otpId).set({
    otp,
    userId,
    phoneNumber,
    actionId,
    metaData,
    expiresAt: expiresAt.toISOString(),
    used: false,
    retryCount: 0,
    maxRetries: 3,
    createdAt: new Date().toISOString(),
  });
  await otpProvider.sendOtp(otp);
  return { otpId, expiresAt };
}

// verifyOtp remains unchanged
export async function verifyOtp({ otpId, otp }) {
  const docRef = db.collection("otps").doc(otpId);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error("OTP not found");

  const data = doc.data();
  if (data.used) throw new Error("OTP already used");
  if (new Date(data.expiresAt) < new Date()) throw new Error("OTP expired");
  if (data.retryCount >= data.maxRetries)
    throw new Error("OTP retry limit exceeded");

  if (data.otp !== otp) {
    await docRef.update({ retryCount: data.retryCount + 1 });
    throw new Error("Invalid OTP");
  }

  await docRef.update({ used: true });

  if (data.actionId) {
    const helper = helperRegistry[data.actionId];
    if (!helper) throw new Error("Helper not found");

    try {
      const result = await helper(data.metaData);
      await logAction({
        otpId,
        userId: data.userId,
        actionId: data.actionId,
        success: true,
        metaData: data.metaData,
      });
      return { success: true, result };
    } catch (err) {
      await logAction({
        otpId,
        userId: data.userId,
        actionId: data.actionId,
        success: false,
        error: err.message,
        metaData: data.metaData,
      });
      return {
        success: false,
        error: "Helper execution failed: " + err.message,
      };
    }
  }

  return { success: true };
}

async function logAction({
  otpId,
  userId,
  actionId,
  success,
  error = null,
  metaData = {},
}) {
  await db.collection("otpLogs").add({
    otpId,
    userId,
    actionId,
    success,
    error,
    metaData,
    timestamp: new Date().toISOString(),
  });
}
