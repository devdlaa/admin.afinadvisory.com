import { Timestamp } from "firebase-admin/firestore";

import admin from "@/lib/firebase-admin";

const db = admin.firestore();

const log = (message, data = null) => {
  console.log(`[RefundHelpers] ${message}`, data ? JSON.stringify(data) : "");
};

// Utility function for input validation
const validateServiceId = (serviceId) => {
  if (!serviceId || typeof serviceId !== "string") {
    throw new Error("Valid Service ID is required");
  }
};

// Step: Refund Requested by user
export async function markRefundRequested(serviceId, reason) {
  validateServiceId(serviceId);
  if (!reason || typeof reason !== "string") {
    return { serviceId, success: false, reason: "Refund reason is required" };
  }

  const serviceRef = db.collection("service_bookings").doc(serviceId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);
      if (!doc.exists) {
        return { serviceId, success: false, reason: "Service not found" };
      }

      const data = doc.data();

      // Only allow refund request if master_status is "in_progress"
      if (data?.master_status !== "in_progress") {
        return {
          serviceId,
          success: false,
          reason: `Cannot request refund: service status is ${data?.master_status}`,
        };
      }

      const step = {
        step_id: "REFUND_REQUESTED",
        step_name: "Refund Requested",
        step_desc: "Customer has requested a refund.",
        isCompleted: true,
        completed_at: Timestamp.now(),
      };

      // Update refund details
      transaction.update(serviceRef, {
        isRefundFlagged: true,
        "refundDetails.isRefund": true,
        "refundDetails.current_status": "requested",
        "refundDetails.requestedAt": Timestamp.now(),
        "refundDetails.reason": reason,
      });

      await addStepInTransaction(transaction, serviceRef, step, data);

      return { serviceId, success: true };
    });

    return result;
  } catch (error) {
    return {
      serviceId,
      success: false,
      reason: error.message || "Transaction failed",
    };
  }
}

// Step: Refund Rejected by admin
export async function markRefundRejected(service_booking_id, adminNote) {
  try {
    validateServiceId(service_booking_id);

    if (!adminNote || typeof adminNote !== "string") {
      return { success: false, reason: "Admin note is required" };
    }

    const serviceRef = db
      .collection("service_bookings")
      .doc(service_booking_id);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);

      if (!doc.exists) {
        throw new Error("Service not found");
      }

      const data = doc.data();
      const steps = data?.progress_steps?.steps || {};
      const stepKeys = Object.keys(steps).sort((a, b) => Number(a) - Number(b));
      const lastStep = stepKeys.length > 0 ? steps[stepKeys.length - 1] : null;

      // Prevent multiple rejections
      if (data?.refundDetails?.current_status === "rejected") {
        throw new Error("Refund has already been rejected");
      }

      // Prevent rejection if service is fulfilled
      if (data?.progress_steps?.isFulfilled) {
        throw new Error("Service already fulfilled");
      }

      // Only allow rejection if last step is REFUND_REQUESTED
      if (!lastStep || lastStep.step_id !== "REFUND_REQUESTED") {
        throw new Error(
          "Cannot reject refund: last step is not REFUND_REQUESTED"
        );
      }

      // Mark REFUND_REQUESTED step as completed
      for (const key of stepKeys) {
        if (steps[key].step_id === "REFUND_REQUESTED") {
          steps[key].isCompleted = true;
          steps[key].completed_at = Timestamp.now();
        }
      }
      // Add REFUND_REJECTED step
      const nextIndex = stepKeys.length.toString();
      const newStep = {
        step_id: "REFUND_REJECTED",
        step_name: "Refund Rejected",
        step_desc: "Refund request was rejected by the team.",
        isCompleted: true,
        completed_at: Timestamp.now(),
      };

      const updatedSteps = { ...steps, [nextIndex]: newStep };

      transaction.update(serviceRef, {
        "refundDetails.current_status": "rejected",
        "refundDetails.admin_notes": adminNote,
        "refundDetails.rejectedAt": Timestamp.now(),
        "progress_steps.steps": updatedSteps,
        "progress_steps.current_step": newStep.step_name,
        "progress_steps.current_step_index": parseInt(nextIndex),
        "progress_steps.isFulfilled": false,
      });
    });

    // Fetch the updated document after transaction
    const updated_service = await serviceRef.get();
    return { success: true, updatedService: updated_service.data() };
  } catch (error) {
    return { success: false, reason: error.message || "Transaction failed" };
  }
}

// Step: Refund Initiated
export async function markRefundInitiated(service_booking_id, meta_info) {
  validateServiceId(service_booking_id);

  const serviceRef = db.collection("service_bookings").doc(service_booking_id);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);

      if (!doc.exists) {
        return {
          service_booking_id,
          success: false,
          type: "edge_case",
          reason: "Service not found",
        };
      }

      const data = doc.data();
      const steps = data?.progress_steps?.steps || {};
      const stepKeys = Object.keys(steps);
      const lastStep =
        stepKeys.length > 0 ? steps[stepKeys[stepKeys.length - 1]] : null;

      // ✅ Edge case: Service not in progress
      if (data.master_status !== "in_progress") {
        return {
          service_booking_id,
          success: false,
          type: "edge_case",
          reason: `Cannot initiate refund. Service status is ${data.master_status}`,
        };
      }

      // ✅ Edge case: Last step is not REFUND_REQUESTED
      if (lastStep?.step_id !== "REFUND_REQUESTED") {
        return {
          service_booking_id,
          success: false,
          type: "edge_case",
          reason: `Cannot initiate refund. Last step is ${
            lastStep?.step_id || "none"
          }`,
        };
      }

      // Add REFUND_INITIATED step
      const nextIndex = stepKeys.length.toString();
      const newStep = {
        step_id: "REFUND_INITIATED",
        step_name: "Refund Initiated",
        step_desc: "Refund accepted & team has initiated the process.",
        isCompleted: true,
        completed_at: Timestamp.now(),
      };

      const updatedSteps = {
        ...steps,
        [nextIndex]: newStep,
      };

      // Null-check meta_info (Razorpay response)
      const razorpayRefundDetails =
        meta_info && typeof meta_info === "object" ? meta_info : {};

      transaction.update(serviceRef, {
        "refundDetails.current_status": "initiated",
        "refundDetails.initiatedAt": Timestamp.now(),
        "refundDetails.razorpay_refund_details": razorpayRefundDetails,
        "progress_steps.steps": updatedSteps,
        "progress_steps.current_step": newStep.step_name,
        "progress_steps.current_step_index": parseInt(nextIndex),
        "progress_steps.isFulfilled": false,
      });

      return { service_booking_id, success: true, type: "mutation" };
    });

    return result;
  } catch (error) {
    // ❌ Real DB failure
    return {
      service_booking_id,
      success: false,
      type: "failure",
      reason: error.message || "Transaction failed",
    };
  }
}

// Step: Refund Credited
export async function markRefundCredited(service_booking_id, refundInfo) {
  try {
    validateServiceId(service_booking_id);

    if (!refundInfo) {
      throw new Error("Refund information is required");
    }

    log(`Marking refund credited for service: ${service_booking_id}`);

    const step = {
      step_id: "REFUND_COMPLETED",
      step_name: "Refund Credited",
      step_desc: "Refund has been successfully credited to your Bank Account.",
      isCompleted: true,
      completed_at: Timestamp.now(),
    };

    const serviceRef = db
      .collection("service_bookings")
      .doc(service_booking_id);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);
      if (!doc.exists) {
        throw new Error("Service not found");
      }

      const data = doc.data();
      const steps = data?.progress_steps?.steps || {};
      const nextIndex = Object.keys(steps).length.toString();

      const updatedSteps = {
        ...steps,
        [nextIndex]: step,
      };

      transaction.update(serviceRef, {
        "refundDetails.current_status": "refunded",
        "refundDetails.refundDate": Timestamp.now(),
        "refundDetails.razorpay_refund_details": refundInfo,

        "progress_steps.steps": updatedSteps,
        "progress_steps.current_step": step.step_name,
        "progress_steps.current_step_index": parseInt(nextIndex),
        "progress_steps.isFulfilled": true, // ✅ Refund is successful, service fulfilled
        master_status: "refunded",
      });
    });

    log(
      `Successfully marked refund credited for service: ${service_booking_id}`
    );
  } catch (error) {
    log(
      `Error marking refund credited for service ${service_booking_id}:`,
      error.message
    );
    throw error;
  }
}

export async function addStepInTransaction(
  transaction,
  serviceRef,
  step,
  docData
) {
  if (!docData?.progress_steps) {
    log(`Progress steps not found for service, skipping step addition`);
    return;
  }

  const existingSteps = docData.progress_steps.steps || {};

  const stepAlreadyExists = Object.values(existingSteps).some(
    (s) => s.step_id === step.step_id
  );
  if (stepAlreadyExists) {
    log(`Step ${step.step_id} already exists, skipping addition`);
    return;
  }

  const nextIndex = Object.keys(existingSteps).length.toString();

  const updatedSteps = {
    ...existingSteps,
    [nextIndex]: step,
  };

  transaction.update(serviceRef, {
    "progress_steps.steps": updatedSteps,
    "progress_steps.current_step": step.step_name,
    "progress_steps.current_step_index": parseInt(nextIndex),
  });
}

export async function markServiceFulfilledByAdmin(service_booking_ids) {
  // ✅ Accept single ID or array
  const ids = Array.isArray(service_booking_ids)
    ? service_booking_ids
    : [service_booking_ids];

  const results = [];

  for (const id of ids) {
    validateServiceId(id);
    const serviceRef = db.collection("service_bookings").doc(id);

    try {
      const result = await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(serviceRef);
        if (!doc.exists) {
          return { id, success: false, reason: "Service not found" };
        }

        const data = doc.data();
        const steps = data?.progress_steps?.steps || {};
        const stepKeys = Object.keys(steps);
        const lastStep =
          stepKeys.length > 0 ? steps[stepKeys.length - 1] : null;

        // Already fulfilled?
        if (lastStep?.step_id === "SERVICE_FULFILLED") {
          return { id, success: false, reason: "Already fulfilled" };
        }

        // Check refund-related steps
        if (lastStep) {
          const forbiddenLastSteps = [
            "REFUND_REQUESTED",
            "REFUND_INITIATED",
            "REFUND_COMPLETED",
          ];
          if (forbiddenLastSteps.includes(lastStep.step_id)) {
            return {
              id,
              success: false,
              reason: `Cannot fulfill service because last step is ${lastStep.step_id}`,
            };
          }
        }

        // ✅ Mark all previous steps as completed
        const completedSteps = {};
        for (const key of stepKeys) {
          completedSteps[key] = {
            ...steps[key],
            isCompleted: true,
          };
        }

        // Allowed → append new fulfilled step
        const nextIndex = stepKeys.length.toString();
        const newStep = {
          step_id: "SERVICE_FULFILLED",
          step_name: "Process Fulfilled",
          step_desc: "Congrats, Your Service Request has Been Completed",
          isCompleted: true,
          completed_at: Timestamp.now(),
        };

        const updatedSteps = {
          ...completedSteps,
          [nextIndex]: newStep,
        };

        transaction.update(serviceRef, {
          "progress_steps.steps": updatedSteps,
          "progress_steps.current_step": newStep.step_name,
          "progress_steps.current_step_index": parseInt(nextIndex),
          "progress_steps.isFulfilled": true,
          master_status: "completed",
        });

        return { id, success: true };
      });

      // Fetch the fresh doc to return updated data if fulfilled
      if (result.success) {
        const fresh = await serviceRef.get();
        results.push({
          success: true,
          service: { id: fresh.id, ...fresh.data() },
        });
      } else {
        results.push(result);
      }
    } catch (error) {
      results.push({
        id,
        success: false,
        reason: error.message || "Transaction failed",
      });
    }
  }

  return results; // ✅ Always returns an array of results
}

// Helper function to get current refund status
export async function getRefundStatus(serviceId) {
  try {
    validateServiceId(serviceId);

    const doc = await db.collection("services").doc(serviceId).get();
    if (!doc.exists) {
      throw new Error("Service not found");
    }

    const data = doc.data();
    return {
      isRefundFlagged: data.isRefundFlagged || false,
      refundDetails: data.refundDetails || null,
      masterStatus: data.master_status || null,
    };
  } catch (error) {
    log(`Error getting refund status for service ${serviceId}:`, error.message);
    throw error;
  }
}

export async function unmarkServiceFulfilledByAdmin(service_booking_id) {
  validateServiceId(service_booking_id);
  log(`Unmarking service fulfilled: ${service_booking_id}`);

  const serviceRef = db.collection("service_bookings").doc(service_booking_id);

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);
      if (!doc.exists) throw new Error("Service not found");

      const data = doc.data();
      const steps = { ...data.progress_steps.steps };

      // Ensure keys are sorted numerically
      const stepKeys = Object.keys(steps).sort((a, b) => Number(a) - Number(b));
      const lastIndex = stepKeys[stepKeys.length - 1];

      if (steps[lastIndex]?.step_id !== "SERVICE_FULFILLED") {
        throw new Error("Last step is not SERVICE_FULFILLED, cannot unmark");
      }

      // Remove the last step
      delete steps[lastIndex];

      // Find the SERVICE_IN_PROGRESS step
      let currentStepIndex = null;
      let currentStepName = null;

      for (const key of stepKeys) {
        if (steps[key]?.step_id === "SERVICE_IN_PROGRESS") {
          steps[key].isCompleted = false;
          currentStepIndex = Number(key);
          currentStepName = steps[key].step_name;
          break;
        }
      }

      // If SERVICE_IN_PROGRESS not found, fallback to new last step
      if (currentStepIndex === null) {
        const newStepKeys = Object.keys(steps).sort(
          (a, b) => Number(a) - Number(b)
        );
        const newLastIndex =
          newStepKeys.length > 0 ? newStepKeys[newStepKeys.length - 1] : null;

        if (newLastIndex !== null) {
          currentStepIndex = Number(newLastIndex);
          currentStepName = steps[newLastIndex].step_name;
        }
      }

      transaction.update(serviceRef, {
        "progress_steps.steps": steps,
        "progress_steps.current_step": currentStepName,
        "progress_steps.current_step_index": currentStepIndex,
        "progress_steps.isFulfilled": false,
        master_status: "processing",
      });
    });

    // ✅ Fetch updated doc AFTER transaction
    const updatedService = await serviceRef.get();

    return {
      success: true,
      service: updatedService.data(),
    };
  } catch (error) {
    return {
      success: false,
      id: service_booking_id,
      reason: error.message || "Transaction failed",
    };
  }
}

export async function rollbackRefundToInitiatedOrCredited({
  service_booking_id,
  adminNote,
  immediateCredit = false,
}) {
  validateServiceId(service_booking_id);

  const serviceRef = db.collection("service_bookings").doc(service_booking_id);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);
      if (!doc.exists) {
        return {
          service_booking_id,
          success: false,
          reason: "Service not found",
        };
      }

      const data = doc.data();
      const steps = data?.progress_steps?.steps || {};
      const stepKeys = Object.keys(steps);

      // Find last in_progress step index
      let lastIndexInProgress = -1;
      for (let i = stepKeys.length - 1; i >= 0; i--) {
        const step = steps[stepKeys[i]];
        if (
          step.step_id === "IN_PROGRESS" ||
          step.step_id === "REFUND_REJECTED"
        ) {
          lastIndexInProgress = i;
          break;
        }
      }

      if (lastIndexInProgress === -1) {
        return {
          service_booking_id,
          success: false,
          reason: "Cannot rollback, no suitable in-progress step found",
        };
      }

      // Remove all steps after lastIndexInProgress
      const newSteps = {};
      for (let i = 0; i <= lastIndexInProgress; i++) {
        newSteps[i.toString()] = steps[stepKeys[i]];
      }

      let nextIndex = Object.keys(newSteps).length;

      // Add REFUND_REQUESTED
      const refundRequestedStep = {
        step_id: "REFUND_REQUESTED",
        step_name: "Refund Requested",
        step_desc: "Customer has requested a refund (rollback).",
        isCompleted: true,
        completed_at: Timestamp.now(),
      };
      newSteps[nextIndex.toString()] = refundRequestedStep;
      nextIndex++;

      // Add REFUND_INITIATED
      const refundInitiatedStep = {
        step_id: "REFUND_INITIATED",
        step_name: "Refund Initiated",
        step_desc: "Refund initiated after rollback.",
        isCompleted: true,
        completed_at: Timestamp.now(),
      };
      newSteps[nextIndex.toString()] = refundInitiatedStep;
      nextIndex++;

      // Optionally add REFUND_CREDITED immediately
      let refundCreditedStep = null;
      if (immediateCredit) {
        refundCreditedStep = {
          step_id: "REFUND_CREDITED",
          step_name: "Refund Credited",
          step_desc: adminNote || "Refund credited by admin.",
          isCompleted: true,
          completed_at: Timestamp.now(),
        };
        newSteps[nextIndex.toString()] = refundCreditedStep;
        nextIndex++;
      }

      // Update meta fields
      const updatedData = {
        "progress_steps.steps": newSteps,
        "progress_steps.current_step_index": nextIndex - 1,
        "progress_steps.current_step": immediateCredit
          ? refundCreditedStep.step_name
          : refundInitiatedStep.step_name,
        "progress_steps.isFulfilled": immediateCredit, // only fulfilled if immediately credited
        "refundDetails.isRefund": true,
        "refundDetails.current_status": immediateCredit
          ? "refunded"
          : "initiated",
        "refundDetails.requestedAt": Timestamp.now(),
        "refundDetails.initiatedAt": Timestamp.now(),
      };

      if (immediateCredit) {
        updatedData["refundDetails.refundDate"] = Timestamp.now();
        updatedData["refundDetails.admin_notes"] = adminNote || null;
      }

      transaction.update(serviceRef, updatedData);

      return {
        service_booking_id,
        success: true,
        stepsAdded: immediateCredit
          ? ["REFUND_REQUESTED", "REFUND_INITIATED", "REFUND_CREDITED"]
          : ["REFUND_REQUESTED", "REFUND_INITIATED"],
      };
    });

    return result;
  } catch (error) {
    return {
      service_booking_id,
      success: false,
      reason: error.message || "Transaction failed",
    };
  }
}
