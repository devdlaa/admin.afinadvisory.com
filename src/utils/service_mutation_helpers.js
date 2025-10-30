import { Timestamp } from "firebase-admin/firestore";
import admin from "@/lib/firebase-admin";

const db = admin.firestore();
const FEATURE_ENABLED = process.env.ASSIGNMENT_FEATURE_ENABLED === "true";

// ============================================================================
// 🧠 STRUCTURED LOGGING UTILITY
// ============================================================================
const logger = {
  log: (action, data = {}) => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        module: "RefundHelpers",
        action,
        ...data,
      })
    );
  },
  error: (action, error, data = {}) => {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        module: "RefundHelpers",
        action,
        error: error.message || error,
        ...data,
      })
    );
  },
};

// ============================================================================
// ⚙️ STANDARDIZED ERROR RESPONSE
// ============================================================================
const createResponse = (success, data = {}) => ({
  success,
  ...data,
});

// ============================================================================
// 🔁 STEP MANAGER UTILITY
// ============================================================================
class StepManager {
  constructor(steps = {}) {
    this.steps = { ...steps };
  }

  getStepKeys() {
    return Object.keys(this.steps).sort((a, b) => Number(a) - Number(b));
  }

  getLastStep() {
    const keys = this.getStepKeys();
    return keys.length > 0 ? this.steps[keys[keys.length - 1]] : null;
  }

  stepExists(stepId) {
    return Object.values(this.steps).some((s) => s.step_id === stepId);
  }

  markAllCompleted() {
    const completed = {};
    Object.keys(this.steps).forEach((key) => {
      completed[key] = {
        ...this.steps[key],
        isCompleted: true,
        completed_at: this.steps[key].completed_at || Timestamp.now(),
      };
    });
    this.steps = completed;
    return this;
  }

  addStep(step) {
    if (this.stepExists(step.step_id)) {
      logger.log("step_already_exists", { step_id: step.step_id });
      return this;
    }

    const nextIndex = this.getStepKeys().length.toString();
    this.steps[nextIndex] = {
      ...step,
      isCompleted: step.isCompleted ?? true,
      completed_at: step.completed_at || Timestamp.now(),
    };
    return this;
  }

  removeStepsAfterIndex(index) {
    const newSteps = {};
    const keys = this.getStepKeys();
    for (let i = 0; i <= index; i++) {
      newSteps[i.toString()] = this.steps[keys[i]];
    }
    this.steps = newSteps;
    return this;
  }

  removeLastStep() {
    const keys = this.getStepKeys();
    if (keys.length > 0) {
      delete this.steps[keys[keys.length - 1]];
    }
    return this;
  }

  findStepIndex(stepId) {
    const keys = this.getStepKeys();
    return keys.findIndex((key) => this.steps[key]?.step_id === stepId);
  }

  markStepIncomplete(stepId) {
    const keys = this.getStepKeys();
    for (const key of keys) {
      if (this.steps[key].step_id === stepId) {
        this.steps[key].isCompleted = false;
        return this;
      }
    }
    return this;
  }

  getCurrentStepInfo() {
    const keys = this.getStepKeys();
    const lastIndex = keys.length - 1;
    const lastStep = keys.length > 0 ? this.steps[keys[lastIndex]] : null;

    return {
      steps: this.steps,
      current_step: lastStep?.step_name || null,
      current_step_index: lastIndex >= 0 ? lastIndex : null,
    };
  }

  getSteps() {
    return this.steps;
  }
}

// ============================================================================
// 🧩 TRANSACTION HELPER
// ============================================================================
async function runServiceTransaction(serviceId, callback) {
  const serviceRef = db.collection("service_bookings").doc(serviceId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(serviceRef);

      if (!doc.exists) {
        return createResponse(false, {
          serviceId,
          type: "edge_case",
          reason: "Service not found",
        });
      }

      const data = doc.data();
      return await callback(transaction, serviceRef, doc, data);
    });

    return result;
  } catch (error) {
    logger.error("transaction_failed", error, { serviceId });
    return createResponse(false, {
      serviceId,
      type: "failure",
      reason: error.message || "Transaction failed",
    });
  }
}

// ============================================================================
// 📦 FEATURE TOGGLE UTILITY
// ============================================================================
function isFeatureAllowed(user, booking) {
  if (!FEATURE_ENABLED) return true;
  if (user.role === "superAdmin") return true;
  if (booking.assignmentManagement?.assignToAll) return true;

  const userEmail = user.email.toLowerCase();
  return (
    Array.isArray(booking.assignedKeys) &&
    booking.assignedKeys.includes(`email:${userEmail}`)
  );
}

// ============================================================================
// 🧼 VALIDATION HELPERS
// ============================================================================
const validateServiceId = (serviceId) => {
  if (!serviceId || typeof serviceId !== "string") {
    throw new Error("Valid Service ID is required");
  }
};

const validateReason = (reason) => {
  if (!reason || typeof reason !== "string") {
    throw new Error("Reason is required");
  }
};

// ============================================================================
// 🔒 STATUS GUARDS
// ============================================================================
const statusGuards = {
  canRequestRefund: (masterStatus) => masterStatus === "in_progress",
  canRejectRefund: (data) => {
    if (data.refundDetails?.current_status === "rejected") {
      return { allowed: false, reason: "Refund already rejected" };
    }
    if (data.progress_steps?.isFulfilled) {
      return { allowed: false, reason: "Service already fulfilled" };
    }
    const stepManager = new StepManager(data.progress_steps?.steps);
    const lastStep = stepManager.getLastStep();
    if (!lastStep || lastStep.step_id !== "REFUND_REQUESTED") {
      return {
        allowed: false,
        reason: "Cannot reject refund: last step is not REFUND_REQUESTED",
      };
    }
    return { allowed: true };
  },
  canInitiateRefund: (data) => {
    if (data.master_status !== "processing") {
      return {
        allowed: false,
        reason: `Cannot initiate refund. Service status is ${data.master_status}`,
      };
    }
    return { allowed: true };
  },
  canFulfillService: (data) => {
    const stepManager = new StepManager(data.progress_steps?.steps);
    const lastStep = stepManager.getLastStep();

    if (lastStep?.step_id === "SERVICE_FULFILLED") {
      return { allowed: false, reason: "Already fulfilled" };
    }

    const forbiddenSteps = [
      "REFUND_REQUESTED",
      "REFUND_INITIATED",
      "REFUND_COMPLETED",
    ];
    if (lastStep && forbiddenSteps.includes(lastStep.step_id)) {
      return {
        allowed: false,
        reason: `Cannot fulfill service because last step is ${lastStep.step_id}`,
      };
    }

    return { allowed: true };
  },
};

// ============================================================================
// REFUND WORKFLOW FUNCTIONS
// ============================================================================

// Step: Refund Requested by user
export async function markRefundRequested(serviceId, reason) {
  validateServiceId(serviceId);
  validateReason(reason);

  logger.log("refund_requested", { serviceId });

  return runServiceTransaction(serviceId, async (transaction, ref, doc, data) => {
    if (!statusGuards.canRequestRefund(data.master_status)) {
      return createResponse(false, {
        serviceId,
        reason: `Cannot request refund: service status is ${data.master_status}`,
      });
    }

    const stepManager = new StepManager(data.progress_steps?.steps);
    stepManager.addStep({
      step_id: "REFUND_REQUESTED",
      step_name: "Refund Requested",
      step_desc: "Customer has requested a refund.",
    });

    const stepInfo = stepManager.getCurrentStepInfo();

    transaction.update(ref, {
      isRefundFlagged: true,
      "refundDetails.isRefund": true,
      "refundDetails.current_status": "requested",
      "refundDetails.requestedAt": Timestamp.now(),
      "refundDetails.reason": reason,
      "progress_steps.steps": stepInfo.steps,
      "progress_steps.current_step": stepInfo.current_step,
      "progress_steps.current_step_index": stepInfo.current_step_index,
    });

    return createResponse(true, { serviceId });
  });
}

// Step: Refund Rejected by admin
export async function markRefundRejected(service_booking_id, adminNote, session) {
  validateServiceId(service_booking_id);
  validateReason(adminNote);

  logger.log("refund_rejected", { service_booking_id });

  return runServiceTransaction(
    service_booking_id,
    async (transaction, ref, doc, data) => {
      // Access check
      if (!isFeatureAllowed(session.user, data)) {
        return createResponse(false, {
          id: service_booking_id,
          reason: "Not assigned to this booking",
        });
      }

      // Status guard
      const guardResult = statusGuards.canRejectRefund(data);
      if (!guardResult.allowed) {
        return createResponse(false, {
          id: service_booking_id,
          reason: guardResult.reason,
        });
      }

      const stepManager = new StepManager(data.progress_steps?.steps);
      stepManager.addStep({
        step_id: "REFUND_REJECTED",
        step_name: "Refund Rejected",
        step_desc: "Refund request was rejected by the team.",
      });

      const stepInfo = stepManager.getCurrentStepInfo();

      transaction.update(ref, {
        "refundDetails.current_status": "rejected",
        "refundDetails.admin_notes": adminNote,
        "refundDetails.rejectedAt": Timestamp.now(),
        "progress_steps.steps": stepInfo.steps,
        "progress_steps.current_step": stepInfo.current_step,
        "progress_steps.current_step_index": stepInfo.current_step_index,
        "progress_steps.isFulfilled": false,
      });

      // Fetch updated document for response
      const updatedDoc = await ref.get();
      return createResponse(true, { updatedService: updatedDoc.data() });
    }
  );
}

// Step: Refund Initiated (supports retry)
export async function markRefundInitiated(service_booking_id, meta_info) {
  validateServiceId(service_booking_id);

  logger.log("refund_initiated", { service_booking_id });

  return runServiceTransaction(
    service_booking_id,
    async (transaction, ref, doc, data) => {
      // Status guard
      const guardResult = statusGuards.canInitiateRefund(data);
      if (!guardResult.allowed) {
        return createResponse(false, {
          service_booking_id,
          type: "edge_case",
          reason: guardResult.reason,
        });
      }

      const stepManager = new StepManager(data.progress_steps?.steps);
      const lastStep = stepManager.getLastStep();

      // Detect retry
      const isRetry =
        data.refundDetails?.current_status === "failed" ||
        lastStep?.step_id === "REFUND_INITIATED";

      // Guard for first attempt
      if (!isRetry && lastStep?.step_id !== "REFUND_REQUESTED") {
        return createResponse(false, {
          service_booking_id,
          type: "edge_case",
          reason: `Cannot initiate refund. Last step is ${lastStep?.step_id || "none"}`,
        });
      }

      const razorpayRefundDetails =
        meta_info && typeof meta_info === "object" ? meta_info : {};
      const attemptNumber = (data.refundDetails?.last_attempt_number || 0) + 1;

      // First-time initiation: mark all steps completed + add new step
      if (!isRetry) {
        stepManager.markAllCompleted().addStep({
          step_id: "REFUND_INITIATED",
          step_name: "Refund Initiated",
          step_desc: "Refund accepted & team has initiated the process.",
        });

        const stepInfo = stepManager.getCurrentStepInfo();

        transaction.update(ref, {
          "progress_steps.steps": stepInfo.steps,
          "progress_steps.current_step": stepInfo.current_step,
          "progress_steps.current_step_index": stepInfo.current_step_index,
          "progress_steps.isFulfilled": false,
        });
      }

      // Common updates for both first-time and retry
      transaction.update(ref, {
        "refundDetails.current_status": "initiated",
        "refundDetails.initiatedAt": Timestamp.now(),
        "refundDetails.razorpay_refund_details": razorpayRefundDetails,
        "refundDetails.last_attempt_number": attemptNumber,
        "refundDetails.reason":
          meta_info?.notes?.refund_reason || data.refundDetails?.reason || "",
        "refundDetails.initiatedBy": meta_info?.notes?.refund_by_user_id || null,
        "refundDetails.isRefundInProgress": true,
        "refundDetails.attempts": admin.firestore.FieldValue.arrayUnion({
          attempt: attemptNumber,
          razorpay_refund_id: razorpayRefundDetails.id,
          amount: razorpayRefundDetails.amount,
          status: "initiated",
          requestedAt: Timestamp.now(),
        }),
      });

      return createResponse(true, {
        service_booking_id,
        type: isRetry ? "retry" : "mutation",
      });
    }
  );
}

// Handles if refund fails
export async function markRefundFailed(service_booking_id, refundInfo) {
  validateServiceId(service_booking_id);

  logger.log("refund_failed", { service_booking_id });

  return runServiceTransaction(
    service_booking_id,
    async (transaction, ref, doc, data) => {
      const attemptNumber = data.refundDetails?.last_attempt_number || 0;

      const failedAt = refundInfo?.created_at
        ? Timestamp.fromMillis(refundInfo.created_at * 1000)
        : Timestamp.now();

      transaction.update(ref, {
        "refundDetails.current_status": "failed",
        "refundDetails.isRefundInProgress": false,
        "refundDetails.failure_reason":
          refundInfo?.status_reason || refundInfo?.reason || "Unknown",
        "refundDetails.last_failed_at": failedAt,
        "refundDetails.attempts": admin.firestore.FieldValue.arrayUnion({
          attempt: attemptNumber,
          razorpay_refund_id: refundInfo?.id || null,
          amount: refundInfo?.amount ? refundInfo.amount / 100 : null,
          status: "failed",
          failedAt,
        }),
      });

      return createResponse(true, { service_booking_id });
    }
  );
}

// Step: Refund Credited
export async function markRefundCredited(
  service_booking_id,
  refundInfo,
  creditNoteNumber
) {
  validateServiceId(service_booking_id);

  if (!refundInfo) {
    throw new Error("Refund information is required");
  }

  logger.log("refund_credited", { service_booking_id });

  const refundTimestamp = Timestamp.fromMillis(refundInfo.created_at * 1000);
  const refundAmountInRupees = refundInfo?.amount ? refundInfo.amount / 100 : 0;

  return runServiceTransaction(
    service_booking_id,
    async (transaction, ref, doc, data) => {
      const stepManager = new StepManager(data.progress_steps?.steps);
      stepManager.addStep({
        step_id: "REFUND_COMPLETED",
        step_name: "Refund Credited",
        step_desc: "Refund has been successfully credited to your Bank Account.",
      });

      const stepInfo = stepManager.getCurrentStepInfo();

      transaction.update(ref, {
        "refundDetails.creditNoteNumber": creditNoteNumber,
        "refundDetails.current_status":
          refundInfo?.status === "processed" ? "refunded" : "failed",
        "refundDetails.refundDate": refundTimestamp,
        "refundDetails.refundAmount": refundAmountInRupees,
        "refundDetails.razorpay_refund_details": refundInfo,
        "refundDetails.isRefund": true,
        "refundDetails.isFullRefund": true,
        "refundDetails.razorpay_acquirer_data": refundInfo?.acquirer_data || {},
        "refundDetails.isRefundInProgress": false,
        "progress_steps.steps": stepInfo.steps,
        "progress_steps.current_step": stepInfo.current_step,
        "progress_steps.current_step_index": stepInfo.current_step_index,
        "progress_steps.isFulfilled": true,
        master_status: "refunded",
      });

      return createResponse(true, { service_booking_id });
    }
  );
}

// Mark Service Fulfilled by Admin
export async function markServiceFulfilledByAdmin(service_booking_ids, session) {
  const ids = Array.isArray(service_booking_ids)
    ? service_booking_ids
    : [service_booking_ids];

  const results = [];

  for (const id of ids) {
    try {
      validateServiceId(id);

      const result = await runServiceTransaction(
        id,
        async (transaction, ref, doc, data) => {
          // Access check
          if (!isFeatureAllowed(session.user, data)) {
            return createResponse(false, {
              id,
              reason: "Not assigned to this booking",
            });
          }

          // Status guard
          const guardResult = statusGuards.canFulfillService(data);
          if (!guardResult.allowed) {
            return createResponse(false, { id, reason: guardResult.reason });
          }

          const stepManager = new StepManager(data.progress_steps?.steps);
          stepManager.markAllCompleted().addStep({
            step_id: "SERVICE_FULFILLED",
            step_name: "Process Fulfilled",
            step_desc: "Congrats, Your Service Request has Been Completed",
          });

          const stepInfo = stepManager.getCurrentStepInfo();

          transaction.update(ref, {
            "progress_steps.steps": stepInfo.steps,
            "progress_steps.current_step": stepInfo.current_step,
            "progress_steps.current_step_index": stepInfo.current_step_index,
            "progress_steps.isFulfilled": true,
            master_status: "completed",
          });

          return createResponse(true, { id });
        }
      );

      if (result.success) {
        const serviceRef = db.collection("service_bookings").doc(id);
        const fresh = await serviceRef.get();
        results.push(createResponse(true, { service: { id: fresh.id, ...fresh.data() } }));
      } else {
        results.push(result);
      }
    } catch (error) {
      logger.error("mark_fulfilled_failed", error, { id });
      results.push(createResponse(false, { id, reason: error.message }));
    }
  }

  return results;
}

// Unmark Service Fulfilled by Admin
export async function unmarkServiceFulfilledByAdmin(service_booking_id, session) {
  validateServiceId(service_booking_id);

  logger.log("unmark_service_fulfilled", { service_booking_id });

  const result = await runServiceTransaction(
    service_booking_id,
    async (transaction, ref, doc, data) => {
      // Access check
      if (!isFeatureAllowed(session.user, data)) {
        return createResponse(false, {
          id: service_booking_id,
          reason: "Not assigned to this booking",
        });
      }

      const stepManager = new StepManager(data.progress_steps?.steps);
      const lastStep = stepManager.getLastStep();

      if (lastStep?.step_id !== "SERVICE_FULFILLED") {
        return createResponse(false, {
          id: service_booking_id,
          reason: "Last step is not SERVICE_FULFILLED, cannot unmark",
        });
      }

      // Remove last step
      stepManager.removeLastStep();

      // Find and mark SERVICE_IN_PROGRESS as incomplete
      const inProgressIndex = stepManager.findStepIndex("SERVICE_IN_PROGRESS");
      if (inProgressIndex !== -1) {
        stepManager.markStepIncomplete("SERVICE_IN_PROGRESS");
      }

      const stepInfo = stepManager.getCurrentStepInfo();

      transaction.update(ref, {
        "progress_steps.steps": stepInfo.steps,
        "progress_steps.current_step": stepInfo.current_step,
        "progress_steps.current_step_index": stepInfo.current_step_index,
        "progress_steps.isFulfilled": false,
        master_status: "processing",
      });

      return createResponse(true, { service_booking_id });
    }
  );

  if (result.success) {
    const serviceRef = db.collection("service_bookings").doc(service_booking_id);
    const updatedService = await serviceRef.get();
    return createResponse(true, { service: updatedService.data() });
  }

  return result;
}

// Rollback Refund to Initiated or Credited
export async function rollbackRefundToInitiatedOrCredited({
  service_booking_id,
  adminNote,
  immediateCredit = false,
}) {
  validateServiceId(service_booking_id);

  logger.log("rollback_refund", { service_booking_id, immediateCredit });

  return runServiceTransaction(
    service_booking_id,
    async (transaction, ref, doc, data) => {
      const stepManager = new StepManager(data.progress_steps?.steps);
      const stepKeys = stepManager.getStepKeys();

      // Find last in_progress or rejected step
      let lastIndexInProgress = -1;
      for (let i = stepKeys.length - 1; i >= 0; i--) {
        const step = stepManager.getSteps()[stepKeys[i]];
        if (step.step_id === "IN_PROGRESS" || step.step_id === "REFUND_REJECTED") {
          lastIndexInProgress = i;
          break;
        }
      }

      if (lastIndexInProgress === -1) {
        return createResponse(false, {
          service_booking_id,
          reason: "Cannot rollback, no suitable in-progress step found",
        });
      }

      // Remove all steps after the target index
      stepManager.removeStepsAfterIndex(lastIndexInProgress);

      // Add refund steps
      stepManager
        .addStep({
          step_id: "REFUND_REQUESTED",
          step_name: "Refund Requested",
          step_desc: "Customer has requested a refund (rollback).",
        })
        .addStep({
          step_id: "REFUND_INITIATED",
          step_name: "Refund Initiated",
          step_desc: "Refund initiated after rollback.",
        });

      if (immediateCredit) {
        stepManager.addStep({
          step_id: "REFUND_CREDITED",
          step_name: "Refund Credited",
          step_desc: adminNote || "Refund credited by admin.",
        });
      }

      const stepInfo = stepManager.getCurrentStepInfo();

      const updatedData = {
        "progress_steps.steps": stepInfo.steps,
        "progress_steps.current_step_index": stepInfo.current_step_index,
        "progress_steps.current_step": stepInfo.current_step,
        "progress_steps.isFulfilled": immediateCredit,
        "refundDetails.isRefund": true,
        "refundDetails.current_status": immediateCredit ? "refunded" : "initiated",
        "refundDetails.requestedAt": Timestamp.now(),
        "refundDetails.initiatedAt": Timestamp.now(),
      };

      if (immediateCredit) {
        updatedData["refundDetails.refundDate"] = Timestamp.now();
        updatedData["refundDetails.admin_notes"] = adminNote || null;
      }

      transaction.update(ref, updatedData);

      return createResponse(true, {
        service_booking_id,
        stepsAdded: immediateCredit
          ? ["REFUND_REQUESTED", "REFUND_INITIATED", "REFUND_CREDITED"]
          : ["REFUND_REQUESTED", "REFUND_INITIATED"],
      });
    }
  );
}

// Helper: Get Refund Status
export async function getRefundStatus(serviceId) {
  try {
    validateServiceId(serviceId);

    const doc = await db.collection("service_bookings").doc(serviceId).get();
    if (!doc.exists) {
      return createResponse(false, { reason: "Service not found" });
    }

    const data = doc.data();
    return createResponse(true, {
      isRefundFlagged: data.isRefundFlagged || false,
      refundDetails: data.refundDetails || null,
      masterStatus: data.master_status || null,
    });
  } catch (error) {
    logger.error("get_refund_status_failed", error, { serviceId });
    return createResponse(false, { reason: error.message });
  }
}