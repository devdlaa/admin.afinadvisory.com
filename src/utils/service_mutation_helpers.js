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
      return {
        service_booking_id,
        success: false,
        reason: "Admin note is required",
      };
    }

    const serviceRef = db
      .collection("service_bookings")
      .doc(service_booking_id);

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
      const lastStep = stepKeys.length > 0 ? steps[stepKeys.length - 1] : null;

      // Check if service is fulfilled
      if (data?.progress_steps?.isFulfilled) {
        return {
          service_booking_id,
          success: false,
          reason: "Service already fulfilled",
        };
      }

      // Only allow rejection if last step is REFUND_REQUESTED
      if (!lastStep || lastStep.step_id !== "REFUND_REQUESTED") {
        return {
          service_booking_id,
          success: false,
          reason: "Cannot reject refund: last step is not REFUND_REQUESTED",
        };
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

      return { service_booking_id, success: true };
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

// Step: Refund Initiated
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
      const razorpayRefundDetails = meta_info && typeof meta_info === "object"
        ? meta_info
        : {};

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

export async function markServiceFulfilledByAdmin(service_booking_id) {
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
      const lastStep =
        stepKeys.length > 0 ? steps[stepKeys[stepKeys.length - 1]] : null;

      // Already fulfilled?
      if (lastStep?.step_id === "SERVICE_FULFILLED") {
        return {
          service_booking_id,
          success: false,
          reason: "Already fulfilled",
        };
      }

      // Check last refund-related step
      if (lastStep) {
        const forbiddenLastSteps = [
          "REFUND_REQUESTED",
          "REFUND_INITIATED",
          "REFUND_COMPLETED",
        ];
        if (forbiddenLastSteps.includes(lastStep.step_id)) {
          return {
            service_booking_id,
            success: false,
            reason: `Cannot fulfill service because last step is ${lastStep.step_id}`,
          };
        }
      }

      // Allowed to fulfill (no last step, or last step is REFUND_REJECTED or normal steps)
      const nextIndex = stepKeys.length.toString();
      const newStep = {
        step_id: "SERVICE_FULFILLED",
        step_name: "Process Fulfilled",
        step_desc: "Congrats, Your Service Request has Been Completed",
        isCompleted: true,
        completed_at: Timestamp.now(),
      };

      const updatedSteps = {
        ...steps,
        [nextIndex]: newStep,
      };

      transaction.update(serviceRef, {
        "progress_steps.steps": updatedSteps,
        "progress_steps.current_step": newStep.step_name,
        "progress_steps.current_step_index": parseInt(nextIndex),
        "progress_steps.isFulfilled": true,
        master_status: "completed",
      });

      return { service_booking_id, success: true };
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

// utils/service_mutation_helpers.ts
export async function unmarkServiceFulfilledByAdmin(service_booking_id) {
  try {
    validateServiceId(service_booking_id);
    log(
      `Unmarking service fulfilled by admin for service: ${service_booking_id}`
    );

    const serviceRef = db
      .collection("service_bookings")
      .doc(service_booking_id);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);

      if (!doc.exists) {
        throw new Error("Service not found");
      }

      const data = doc.data();
      if (!data?.progress_steps?.steps) {
        throw new Error("Progress steps not found");
      }

      const steps = { ...data.progress_steps.steps };
      const lastIndex = Object.keys(steps).length - 1;

      // only roll back if the last step was SERVICE_FULFILLED
      if (steps[lastIndex]?.step_id !== "SERVICE_FULFILLED") {
        throw new Error("Last step is not 'SERVICE_FULFILLED', cannot unmark");
      }

      // remove the last step
      delete steps[lastIndex];

      const newLastIndex = Object.keys(steps).length - 1;
      const newCurrentStep =
        newLastIndex >= 0 ? steps[newLastIndex].step_name : null;

      transaction.update(serviceRef, {
        "progress_steps.steps": steps,
        "progress_steps.current_step": newCurrentStep,
        "progress_steps.current_step_index":
          newLastIndex >= 0 ? newLastIndex : null,
        "progress_steps.isFulfilled": false,
        master_status: "in_progress", // roll back
      });
    });

    log(
      `Successfully unmarked service fulfilled for service: ${service_booking_id}`
    );
  } catch (error) {
    log(
      `Error unmarking service fulfilled for service ${service_booking_id}:`,
      error.message
    );
    throw error;
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
