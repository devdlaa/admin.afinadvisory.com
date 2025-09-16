import { adminRequestRefund } from "./otp-helpers-parents/refundflow";

export const helperRegistry = {
  // ✅ Replace stub with actual parent helper
  ADMIN_REFUND_REQUEST: async (metaData) => {
    console.log("Running ADMIN_REFUND_REQUEST with", metaData);
    return await adminRequestRefund(metaData);
  },
};
