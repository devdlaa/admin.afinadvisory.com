import razorpay from "../razorpay";
import { markRefundInitiated } from "@/utils/service_mutation_helpers";

function flattenNotes(obj, parentKey = "", res = {}) {
  for (const [key, value] of Object.entries(obj || {})) {
    const newKey = parentKey ? `${parentKey}_${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recursively flatten nested objects
      flattenNotes(value, newKey, res);
    } else if (Array.isArray(value)) {
      // Convert arrays to JSON strings
      res[newKey] = JSON.stringify(value);
    } else {
      // Convert everything else to string
      res[newKey] = String(value);
    }
  }
  return res;
}

export async function adminRequestRefund(metaData) {
  const { payment_id, service_booking_id, notes } = metaData;

  if (!payment_id || !service_booking_id) {
    return {
      success: false,
      error: "Missing payment_id or service_booking_id",
    };
  }

  try {
    // -----------------------------
    // 1️⃣ Attempt DB pre-update / validation
    // -----------------------------
    try {
      const dbPreResult = await markRefundInitiated(service_booking_id, null);

      if (dbPreResult.type === "edge_case") {
        // Refund cannot proceed due to business condition
        return {
          success: false,
          type: "edge_case",
          message: dbPreResult.reason,
        };
      }
    } catch (dbErr) {
      // DB mutation failed (real failure) → async retry
      setTimeout(async () => {
        try {
          await markRefundInitiated(service_booking_id, null);
        } catch (retryErr) {
          console.error(
            "Async retry failed for DB pre-update in adminRequestRefund:",
            retryErr
          );
        }
      }, 0);

      return {
        success: false,
        type: "failure",
        message:
          "DB pre-update failed. Refund not processed yet. Retrying automatically.",
        error: dbErr.message,
      };
    }

    // -----------------------------
    // 2️⃣ Call Razorpay refund
    // -----------------------------
    const refundOptions = {
      speed: "normal",
      notes: flattenNotes(notes) || {},
    };

    const razorpayRefund = await razorpay.payments.refund(
      payment_id,
      refundOptions
    );

    if (!["processed", "pending"].includes(razorpayRefund.status)) {
      console.log("razorpayRefund", razorpayRefund);
      return {
        success: false,
        type: "failure",
        message: `Razorpay refund failed with status: ${razorpayRefund.status}`,
        razorpayRefund,
      };
    }

    // -----------------------------
    // 3️⃣ Update DB with Razorpay refund info
    // -----------------------------
    try {
      const dbResult = await markRefundInitiated(
        service_booking_id,
        razorpayRefund
      );

      if (dbResult.type === "edge_case") {
        // Extremely rare: DB says business condition blocked even though pre-check passed
        return {
          success: false,
          type: "edge_case",
          message: dbResult.reason,
          razorpayRefund,
        };
      }

      return { success: true, razorpayRefund, dbResult };
    } catch (dbErr) {
      // DB failed after Razorpay success → async retry
      setTimeout(async () => {
        try {
          await markRefundInitiated(service_booking_id, razorpayRefund);
        } catch (retryErr) {
          console.error(
            "Async retry failed for DB update after Razorpay refund:",
            retryErr
          );
        }
      }, 0);

      return {
        success: false,
        type: "failure",
        message:
          "Refund succeeded in Razorpay, but DB update failed. Retrying automatically. Please check audit logs.",
        razorpayRefund,
        error: dbErr.message,
      };
    }
  } catch (err) {
    // Catch unexpected errors
    console.log("err", err);
    return {
      success: false,
      type: "failure",
      message: err?.description || "Refund workflow failed unexpectedly",
      error: err?.message,
    };
  }
}
