// import * as XLSX from "xlsx";
export function truncateText(text, maxLength = 50) {
  if (!text || typeof text !== "string") return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

// export function exportServiceBookingsToExcel(serviceBookingsData) {
//   // Check if XLSX library is available
//   if (typeof XLSX === "undefined") {
//     console.error(
//       "XLSX library is not loaded. Please include SheetJS library."
//     );
//     return;
//   }

//   // Transform the data to flatten nested objects
//   const flattenedData = serviceBookingsData.map((booking) => {
//     const flatRow = {
//       // Basic booking info
//       id: booking.id,
//       invoiceNumber: booking.invoiceNumber,
//       serviceBookingId: booking.service_booking_id,
//       userId: booking.user_id,
//       payId: booking.pay_id,
//       razorpayOrderId: booking.razorpay_order_id,
//       source: booking.source,
//       isPaymentPending: booking.isPaymentPending,
//       masterStatus: booking.master_status,
//       isRefundFlagged: booking.isRefundFlagged,
//       createdAt: booking.created_at,
//       updatedAt: booking.updated_at,

//       // Service details
//       serviceName: booking.service_details?.service_name,
//       serviceId: booking.service_details?.service_id,
//       serviceDbId: booking.service_details?.service_db_id,

//       // Plan details
//       planName: booking.plan_details?.plan_name,
//       planId: booking.plan_details?.plan_id,
//       planOriginalPrice: booking.plan_details?.plan_original_price,
//       planOfferPrice: booking.plan_details?.plan_offer_price,

//       // State wise extra
//       isMultiState: booking.state_wise_extra?.isMultiState,
//       stateChosen: booking.state_wise_extra?.state_chosen,
//       extraCharge: booking.state_wise_extra?.extraCharge,

//       // Coupon details
//       couponCode: booking.coupon?.code,
//       couponDiscount: booking.coupon?.discount,
//       couponWasValid: booking.coupon?.wasValid,
//       couponInfluencerId: booking.coupon?.influencerId,
//       couponType: booking.coupon?.type,
//       couponId: booking.coupon?.coupon_id,

//       // Payment details
//       isMultiQuantity: booking.payment_details?.isMultiQuantity,
//       maxMultiPurchaseLimit: booking.payment_details?.maxMultiPurchaseLimit,
//       originalPrice: booking.payment_details?.original_price,
//       offerPrice: booking.payment_details?.offer_price,
//       quantityBought: booking.payment_details?.quantity_bought,
//       quantityAdjustedAmount: booking.payment_details?.quantityAdjustedAmount,
//       discountAmount: booking.payment_details?.discountAmount,
//       finalAmountAfterDiscount:
//         booking.payment_details?.finalAmountAfterDiscount,
//       gstRate: booking.payment_details?.gstRate,
//       gstAmount: booking.payment_details?.gstAmount,
//       finalAmountPaid: booking.payment_details?.finalAmountPaid,
//       isGstSplit: booking.payment_details?.isGstSplit,

//       // Payment method
//       paymentVpa: booking.payment_method?.vpa,
//       paymentBank: booking.payment_method?.bank,
//       paymentWallet: booking.payment_method?.wallet,
//       paymentCardId: booking.payment_method?.card_id,
//       paymentMethod: booking.payment_method?.method,
//       inInternationalPayment: booking.payment_method?.inInternationalPayment,

//       // User details
//       firstName: booking.user_details?.firstName,
//       lastName: booking.user_details?.lastName,
//       phone: booking.user_details?.phone,
//       email: booking.user_details?.email,
//       isUserActive: booking.user_details?.isActive,
//       userStreet: booking.user_details?.address?.street,
//       userState: booking.user_details?.address?.state,
//       userUid: booking.user_details?.uid,

//       // Ticket info
//       isTicketOpen: booking.ticket_info?.isTicketOpen,
//       ticketNumber: booking.ticket_info?.ticket_number,
//       ticketId: booking.ticket_info?.ticket_id,
//       isTicketGenerated: booking.ticket_info?.isTicketGenerated,
//       ticketMsg: booking.ticket_info?.msg,
//       isRetryArticleGenerated: booking.ticket_info?.isRetryArticleGenerated,

//       // Internal fee burden
//       amountChargedByRazorpay:
//         booking.internal_fee_burden?.amount_charged_by_razorpay,
//       gstIncluded: booking.internal_fee_burden?.gst_included,

//       // Acquirer data
//       rrn: booking.acquirer_data?.rrn,
//       upiTransactionId: booking.acquirer_data?.upi_transaction_id,

//       // Refund details
//       isRefund: booking.refundDetails?.isRefund,
//       creditNoteNumber: booking.refundDetails?.creditNoteNumber,
//       refundCurrentStatus: booking.refundDetails?.current_status,
//       isFullRefund: booking.refundDetails?.isFullRefund,
//       refundAmount: booking.refundDetails?.refundAmount,
//       refundDate: booking.refundDetails?.refundDate,
//       refundAdminNotes: booking.refundDetails?.admin_notes,
//       refundReason: booking.refundDetails?.reason,
//       refundRequestedAt: booking.refundDetails?.requestedAt?._seconds
//         ? new Date(
//             booking.refundDetails.requestedAt._seconds * 1000
//           ).toISOString()
//         : booking.refundDetails?.requestedAt,

//       // Influencer commission
//       influencerCommission: booking.influencer_commission,
//     };

//     return flatRow;
//   });

//   // Create workbook and worksheet
//   const workbook = XLSX.utils.book_new();
//   const worksheet = XLSX.utils.json_to_sheet(flattenedData);

//   // Set column widths for better readability
//   const colWidths = [];
//   Object.keys(flattenedData[0] || {}).forEach(() => {
//     colWidths.push({ wch: 15 });
//   });
//   worksheet["!cols"] = colWidths;

//   // Add worksheet to workbook
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Service Bookings");

//   // Generate filename with current date
//   const currentDate = new Date().toISOString().split("T")[0];
//   const filename = `service_bookings_${currentDate}.xlsx`;

//   // Write and download the file
//   XLSX.writeFile(workbook, filename);

//   console.log(
//     `Excel file "${filename}" has been generated and downloaded successfully.`
//   );
//   return filename;
// }

// export function exportCustomersToExcel(customersData) {
//   // Check if XLSX library is available
//   if (typeof XLSX === "undefined") {
//     console.error(
//       "XLSX library is not loaded. Please include SheetJS library."
//     );
//     return;
//   }

//   // Transform the data to flatten nested objects
//   const flattenedData = customersData.map((customer) => {
//     const flatRow = {
//       // Basic customer info
//       uid: customer.uid,
//       email: customer.email,
//       firstName: customer.firstName,
//       lastName: customer.lastName,
//       phoneNumber: customer.phoneNumber,
//       alternatePhone: customer.alternatePhone,
//       gender: customer.gender,
//       dob: customer.dob,
//       role: customer.role,
//       accountStatus: customer.accountStatus,

//       // Verification status
//       isPhoneVerified: customer.isPhoneVerified,
//       isEmailVerified: customer.isEmailVerified,
//       isProfileCompleted: customer.isProfileCompleted,

//       // Login methods (array converted to string)
//       loginMethods: Array.isArray(customer.loginMethod)
//         ? customer.loginMethod.join(", ")
//         : customer.loginMethod,

//       // Address details
//       addressStreet: customer.address?.street,
//       addressCity: customer.address?.city,
//       addressState: customer.address?.state,
//       addressPincode: customer.address?.pincode,
//       addressCountry: customer.address?.country,

//       // Timestamps
//       createdAt: customer.createdAt,
//       updatedAt: customer.updatedAt,

//       // Additional fields that might exist
//       profilePicture: customer.profilePicture,
//       lastLoginAt: customer.lastLoginAt,
//       emailVerifiedAt: customer.emailVerifiedAt,
//       phoneVerifiedAt: customer.phoneVerifiedAt,
//       needsGoogleLinking: customer.needsGoogleLinking,

//       // Any custom fields
//       referralCode: customer.referralCode,
//       referredBy: customer.referredBy,
//       totalOrders: customer.totalOrders,
//       totalSpent: customer.totalSpent,
//       loyaltyPoints: customer.loyaltyPoints,
//     };

//     return flatRow;
//   });

//   // Create workbook and worksheet
//   const workbook = XLSX.utils.book_new();
//   const worksheet = XLSX.utils.json_to_sheet(flattenedData);

//   // Set column widths for better readability
//   const colWidths = [];
//   Object.keys(flattenedData[0] || {}).forEach((key) => {
//     // Adjust width based on column content type
//     let width = 15;
//     if (key === "uid") width = 30;
//     if (key === "email") width = 25;
//     if (key.includes("Address")) width = 20;
//     if (key.includes("At")) width = 20; // timestamp fields

//     colWidths.push({ wch: width });
//   });
//   worksheet["!cols"] = colWidths;

//   // Add some styling - freeze the header row
//   worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

//   // Add worksheet to workbook
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

//   // Generate filename with current date
//   const currentDate = new Date().toISOString().split("T")[0];
//   const filename = `customers_export_${currentDate}.xlsx`;

//   // Write and download the file
//   XLSX.writeFile(workbook, filename);

//   console.log(
//     `Excel file "${filename}" has been generated and downloaded successfully.`
//   );
//   return filename;
// }

// export function exportCommissionsToExcel(commissionsData) {
//   if (typeof XLSX === "undefined") {
//     console.error(
//       "XLSX library is not loaded. Please include SheetJS library."
//     );
//     return;
//   }

//   // Flatten commissions data
//   const flattenedData = commissionsData.map((c) => {
//     return {
//       commissionId: c.id,
//       customerId: c.customerId,
//       influencerId: c.influencerId,
//       couponCode: c.couponCode,
//       serviceBookingId: c.service_booking_id,
//       status: c.status,
//       amount: c.amount,

//       // Payment info
//       paidAt: c.paidAt
//         ? new Date(c.paidAt.seconds * 1000).toLocaleString()
//         : null,
//       paidBy: c.paidBy || null,

//       // Metadata
//       createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString() : null,
//     };
//   });

//   const workbook = XLSX.utils.book_new();
//   const worksheet = XLSX.utils.json_to_sheet(flattenedData);

//   // Set column widths
//   const colWidths = [];
//   Object.keys(flattenedData[0] || {}).forEach((key) => {
//     let width = 15;
//     if (key.includes("Id")) width = 30;
//     if (key === "couponCode") width = 20;
//     if (key === "status") width = 12;
//     if (key.includes("At")) width = 25;
//     colWidths.push({ wch: width });
//   });
//   worksheet["!cols"] = colWidths;

//   // Freeze header row
//   worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

//   // Add to workbook
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Commissions");

//   // Filename with today’s date
//   const currentDate = new Date().toISOString().split("T")[0];
//   const filename = `commissions_export_${currentDate}.xlsx`;

//   // Trigger download
//   XLSX.writeFile(workbook, filename);

//   console.log(`Excel file "${filename}" generated successfully.`);
//   return filename;
// }

// export function exportInfluencersToExcel(influencersData) {
//   if (typeof XLSX === "undefined") {
//     console.error(
//       "XLSX library is not loaded. Please include SheetJS library."
//     );
//     return;
//   }

//   // Flatten influencers data
//   const flattenedData = influencersData.map((i) => {
//     return {
//       id: i.id,
//       name: i.name || "",
//       email: i.email || "",
//       username: i.username || "",
//       phone: i.phone || "",
//       status: i.status || "",
//       verificationStatus: i.verificationStatus || "",
//       tags: (i.tags || []).join(", "),
//       totalCampaigns: i.totalCampaigns ?? 0,
//       totalSales: i.totalSales ?? 0,
//       engagementRate: i.engagementRate ?? 0,
//       defaultCommissionRate: i.defaultCommissionRate ?? "",
//       customCommission: i.customCommission
//         ? `${i.customCommission.kind}: ${i.customCommission.amount}${
//             i.customCommission.maxCommission
//               ? ` (max ${i.customCommission.maxCommission})`
//               : ""
//           }`
//         : "",
//       preferredPayoutMethod: i.preferredPayoutMethod || "",
//       bankDetails: i.bankDetails
//         ? `${i.bankDetails.bankName || ""} - ${
//             i.bankDetails.accountHolderName || ""
//           } (${
//             i.bankDetails.accountNumber
//               ? "****" + i.bankDetails.accountNumber.slice(-4)
//               : ""
//           })`
//         : "",
//       address: i.address
//         ? `${i.address.lane || ""}, ${i.address.city || ""}, ${
//             i.address.state || ""
//           }, ${i.address.pincode || ""}, ${i.address.country || ""}`
//         : "",
//       socialLinks: (i.socialLinks || [])
//         .map((s) => `${s.platform}: ${s.url}`)
//         .join(" | "),
//       createdAt: i.createdAt ? new Date(i.createdAt).toLocaleString() : null,
//       updatedAt: i.updatedAt ? new Date(i.updatedAt).toLocaleString() : null,
//       lastActiveAt: i.lastActiveAt
//         ? new Date(i.lastActiveAt).toLocaleString()
//         : null,
//     };
//   });

//   const workbook = XLSX.utils.book_new();
//   const worksheet = XLSX.utils.json_to_sheet(flattenedData);

//   // Set column widths (based on key name)
//   const colWidths = [];
//   Object.keys(flattenedData[0] || {}).forEach((key) => {
//     let width = 20;
//     if (key.includes("id")) width = 30;
//     if (key === "tags") width = 25;
//     if (key === "socialLinks" || key === "address" || key === "bankDetails")
//       width = 50;
//     if (key.includes("At")) width = 25; // timestamps
//     colWidths.push({ wch: width });
//   });
//   worksheet["!cols"] = colWidths;

//   // Freeze header row
//   worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

//   // Add to workbook
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Influencers");

//   // Filename with today’s date
//   const currentDate = new Date().toISOString().split("T")[0];
//   const filename = `influencers_export_${currentDate}.xlsx`;

//   // Trigger download
//   XLSX.writeFile(workbook, filename);

//   console.log(`Excel file "${filename}" generated successfully.`);
//   return filename;
// }

export function generateInfluencerUsername(email, phone) {
  // 1️⃣  Take the email name part (before @) and clean it
  const emailName = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "") // keep only allowed chars
    .slice(0, 20); // limit so we have room

  // 2️⃣  Take last 4 digits of phone
  const phoneTail = phone.replace(/\D/g, "").slice(-4);

  // 3️⃣  Add a random 3-char suffix to reduce collisions
  const randomSuffix = Math.random()
    .toString(36)
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 3);

  // 4️⃣  Compose and trim to meet length requirements
  let username = `${emailName}_${phoneTail}_${randomSuffix}`
    .replace(/[^a-zA-Z0-9_]/g, "") // final clean
    .slice(0, 50);

  // 5️⃣  Ensure minimum length (pad if somehow too short)
  if (username.length < 3) {
    username = (username + "_user").slice(0, 50);
  }

  return username;
}

export function removeEmptyFields(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => removeEmptyFields(item))
      .filter(
        (item) =>
          item !== undefined &&
          item !== null &&
          (typeof item !== "object" || Object.keys(item).length > 0)
      );
  } else if (input !== null && typeof input === "object") {
    const cleaned = {};
    for (const key in input) {
      if (!input.hasOwnProperty(key)) continue;
      const value = input[key];
      if (value === undefined || value === null || value === "") continue;

      if (typeof value === "object") {
        const nested = removeEmptyFields(value);
        if (
          nested !== undefined &&
          nested !== null &&
          (typeof nested !== "object" || Object.keys(nested).length > 0)
        ) {
          cleaned[key] = nested;
        }
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
  // Primitive value (non-empty) → return as is
  return input;
}

export function removeUndefined(input) {
  if (Array.isArray(input)) {
    return input
      .map(removeUndefined)
      .filter((item) => item !== undefined);
  }

  if (input !== null && typeof input === "object") {
    const cleaned = {};
    for (const key in input) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) continue;

      const value = removeUndefined(input[key]);

      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  return input === undefined ? undefined : input;
}

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const formatCurrency = (amount) => {
  return `₹${amount.toLocaleString("en-IN")}`;
};
