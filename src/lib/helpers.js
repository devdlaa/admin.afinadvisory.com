import { adminRequestRefund } from "./otp-helpers-parents/refundflow";

export const helperRegistry = {
  // ✅ Replace stub with actual parent helper
  ADMIN_REFUND_REQUEST: async (metaData) => {
    console.log("Running ADMIN_REFUND_REQUEST with", metaData);
    return await adminRequestRefund(metaData);
  },

  markServiceFulfilled: async (metaData) => {
    console.log("Marking service fulfilled", metaData);
    return { status: "service fulfilled", metaData };
  },

  unmarkFulfilled: async (metaData) => {
    console.log("Unmarking service", metaData);
    return { status: "service unmarked", metaData };
  },
};
