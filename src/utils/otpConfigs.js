export const OTP_CONFIGS = {
  APPROVE_REFUND: (serviceBookingId,serviceAttchedPaymentId,currentLoggedInUserID,service,user) => ({
    actionName: "Approve Refund Request",
    actionInfo:
      "Once approved, the refund cannot be undone. Please confirm this action carefully.",
    confirmText: "Send OTP",
    variant: "primary",
    successMessage: "Refund approved successfully!",
    payload: {
      actionId: "ADMIN_REFUND_REQUEST",
      metaData: {
        payment_id: serviceAttchedPaymentId,
        service_booking_id: serviceBookingId,
        amount: null,
        notes: {
          service_booking_id : serviceBookingId,
          refund_reason: "Customer requested refund",
          refund_by_user_id: currentLoggedInUserID,
          user : {
            firstName : user?.firstName || "",
            lastName : user?.lastName || "",
            email : user?.email || "",
            mobile : user?.mobile || "",
          },
          service : {
            name : service?.name || "Not Available",
          }
        },
      },
    },
    endpoints: {
      initiate: "/api/admin/otp/initiate",
      verify: "/api/admin/otp/verify",
    },
  }),
};
