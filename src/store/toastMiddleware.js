import {
  showSuccess,
  showError,
  showInfo,
} from "@/app/components/toastService";

const toastMiddleware = () => (next) => (action) => {
  // Success messages
  if (action.type.endsWith("/fulfilled")) {
    switch (action.type) {
      // ===== USERS SLICE =====

      // Fetch Users - No toast (silent background operation)
      case "users/fetchUsers/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Search Users - No toast (silent background operation)
      case "users/searchUsers/fulfilled":
        // No toast - search is expected to be silent
        break;

      // Update User (general profile updates)
      case "users/updateUser/fulfilled":
        showSuccess("User profile updated successfully");
        break;

      // Update User Permissions/Role
      case "users/updateUserPermissions/fulfilled":
        const permissionsPayload = action.payload;
        const updatedFields = permissionsPayload?.result?.data?.changes;

        if (updatedFields?.role && updatedFields?.permissions) {
          showSuccess("User role and permissions updated successfully");
        } else if (updatedFields?.role) {
          showSuccess(`User role updated successfully`);
        } else if (updatedFields?.permissions) {
          const permCount = updatedFields.permissions.to?.length || 0;
          showSuccess(
            `User permissions updated (${permCount} permission${
              permCount !== 1 ? "s" : ""
            } assigned)`
          );
        } else {
          showSuccess("User permissions updated successfully");
        }
        break;

      // Invite User
      case "users/inviteUser/fulfilled":
        const invitePayload = action.payload;
        if (invitePayload?.data?.emailSent) {
          showSuccess("User invited successfully! Invitation email sent.");
        } else if (invitePayload?.data?.warning) {
          showInfo(
            "User created but invitation email could not be sent. Please resend manually."
          );
        } else {
          showSuccess("User invitation processed successfully");
        }
        break;

      // Resend Invitation
      case "users/resendInvite/fulfilled":
        showSuccess("Invitation resent successfully");
        break;

      // Reset User Password
      case "users/resetUserPassword/fulfilled":
        const resetPayload = action.payload;
        if (resetPayload?.data?.emailSent) {
          showSuccess("Password reset link sent successfully");
        } else {
          showInfo("Password reset processed but email could not be sent");
        }
        break;

      // Fetch Permissions - No toast (silent background operation)
      case "users/fetchPermissions/fulfilled":
        // No toast - fetching permissions is expected to be silent
        break;

      // Delete User
      case "users/deleteUser/fulfilled":
        showSuccess("User deleted successfully");
        break;

      // ===== CUSTOMERS SLICE =====

      // Fetch Customers - No toast (silent background operation)
      case "customers/fetchCustomers/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Search Customers - No toast (silent background operation)
      case "customers/searchCustomers/fulfilled":
        // No toast - search is expected to be silent
        break;

      // Filter Customers - Show toast only for export mode
      case "customers/filterCustomers/fulfilled":
        const customerFilterPayload = action.payload;
        if (customerFilterPayload?.mode === "export") {
          const exportCount = customerFilterPayload?.resultsCount || 0;
          showSuccess(
            `Export data prepared: ${exportCount} customer${
              exportCount !== 1 ? "s" : ""
            } ready for download`
          );
        }
        // No toast for regular filtering - it's expected to be silent
        break;

      // Update Customer
      case "customers/updateCustomer/fulfilled":
        const updateCustomerPayload = action.payload;
        const customerName =
          updateCustomerPayload?.updatedCustomer?.name ||
          updateCustomerPayload?.updatedCustomer?.email ||
          updateCustomerPayload?.updatedCustomer?.phone ||
          "Customer";
        showSuccess(`${customerName} updated successfully`);
        break;

      // Add New User/Customer
      case "customers/addNewUser/fulfilled":
        const newUserPayload = action.payload;
        const newUserName =
          newUserPayload?.newUser?.name ||
          newUserPayload?.newUser?.email ||
          newUserPayload?.newUser?.phone ||
          "User";

        if (newUserPayload?.passwordResetLink) {
          showSuccess(
            `${newUserName} added successfully! Password reset link generated.`
          );
        } else {
          showSuccess(`${newUserName} added successfully`);
        }
        break;

      // ===== COMMISSIONS SLICE =====

      // Fetch Commissions - No toast (silent background operation)
      case "commissions/fetchCommissions/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Search Commissions - No toast (silent background operation)
      case "commissions/searchCommissions/fulfilled":
        // No toast - search is expected to be silent
        break;

      // Filter Commissions - No toast (silent background operation)
      case "commissions/filterCommissions/fulfilled":
        // No toast - filtering is expected to be silent
        break;

      // Update Commission Status
      case "commissions/updateStatus/fulfilled":
        const statusPayload = action.payload;
        const { updatedCount, skippedCount, actionType, newStatus } =
          statusPayload;

        if (updatedCount > 0 && skippedCount > 0) {
          // Some updated, some skipped
          showSuccess(
            `${updatedCount} commission${
              updatedCount !== 1 ? "s" : ""
            } marked as ${newStatus}. ${skippedCount} already had this status.`
          );
        } else if (updatedCount > 0) {
          // All updated successfully
          showSuccess(
            `${updatedCount} commission${
              updatedCount !== 1 ? "s" : ""
            } marked as ${newStatus} successfully`
          );
        } else if (skippedCount > 0) {
          // None updated (all already had the status)
          showInfo(`All selected commissions already have ${newStatus} status`);
        } else {
          // Fallback success message
          showSuccess("Commission status updated successfully");
        }
        break;

      // ===== INFLUENCERS SLICE =====

      // Fetch Influencers - No toast (silent background operation)
      case "influencers/fetchInfluencers/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Search Influencers - No toast (silent background operation)
      case "influencers/searchInfluencers/fulfilled":
        // No toast - search is expected to be silent
        break;

      // Filter Influencers - Show toast only for export mode
      case "influencers/filterInfluencers/fulfilled":
        const filterPayload = action.payload;
        if (filterPayload?.mode === "export") {
          const exportCount = filterPayload?.resultsCount || 0;
          showSuccess(
            `Export data prepared: ${exportCount} influencer${
              exportCount !== 1 ? "s" : ""
            } ready for download`
          );
        }
        // No toast for regular filtering - it's expected to be silent
        break;

      // Add New Influencer
      case "influencers/addNewInfluencer/fulfilled":
        const newInfluencerPayload = action.payload;
        const influencerName =
          newInfluencerPayload?.newInfluencer?.name ||
          newInfluencerPayload?.newInfluencer?.username ||
          "Influencer";
        showSuccess(`${influencerName} added successfully`);
        break;

      // Update Influencer
      case "influencers/updateInfluencer/fulfilled":
        const updatePayload = action.payload;
        const updatedInfluencerName =
          updatePayload?.updatedInfluencer?.data?.name ||
          updatePayload?.updatedInfluencer?.data?.username ||
          "Influencer";
        showSuccess(`${updatedInfluencerName} updated successfully`);
        break;

      // Delete Influencer
      case "influencers/deleteInfluencer/fulfilled":
        showSuccess("Influencer deleted successfully");
        break;

      // ===== SERVICES SLICE =====

      // Fetch Bookings - No toast (silent background operation)
      case "services/fetchBookings/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Search Bookings - No toast (silent background operation)
      case "services/searchBookings/fulfilled":
        // No toast - search is expected to be silent
        break;

      // Filter Bookings - Show toast only for export mode
      case "services/filterBookings/fulfilled":
        const servicesFilterPayload = action.payload;
        if (servicesFilterPayload?.mode === "export") {
          const exportCount = servicesFilterPayload?.resultsCount || 0;
          showSuccess(
            `Export data prepared: ${exportCount} booking${
              exportCount !== 1 ? "s" : ""
            } ready for download`
          );
        }
        // No toast for regular filtering - it's expected to be silent
        break;

      // Add more slice action mappings here ⬆️
      default:
        break;
    }
  }

  // Error messages
  if (action.type.endsWith("/rejected")) {
    switch (action.type) {
      // ===== USERS SLICE ERRORS =====

      case "users/fetchUsers/rejected":
        showError("Failed to load users. Please refresh and try again.");
        break;

      case "users/searchUsers/rejected":
        showError("Search failed. Please try again.");
        break;

      case "users/updateUser/rejected":
        const updateError = action.error?.message || action.payload?.message;
        if (
          updateError?.includes("already exists") ||
          updateError?.includes("duplicate")
        ) {
          showError("Update failed: Email or phone number already in use");
        } else if (updateError?.includes("not found")) {
          showError("User not found. Please refresh the page.");
        } else {
          showError(updateError || "Failed to update user profile");
        }
        break;

      case "users/deleteUser/rejected":
        const deleteError =
          action.payload?.[0]?.message ||
          action.payload?.message ||
          action.error?.message ||
          "Failed to delete user";
        showError(deleteError);
        break;

      case "users/updateUserPermissions/rejected":
        const permError = action.error?.message || action.payload?.message;
        if (permError?.includes("permission")) {
          showError("Insufficient permissions to update user roles");
        } else {
          showError(permError || "Failed to update user permissions");
        }
        break;

      case "users/inviteUser/rejected":
        const inviteError = action.payload;
        if (inviteError?.errors) {
          // Handle structured errors from API
          const primaryError =
            inviteError.errors.find((err) => err.field === "email") ||
            inviteError.errors.find((err) => err.field === "phone") ||
            inviteError.errors[0];

          if (primaryError?.message?.includes("already exists")) {
            showError(`User with this ${primaryError.field} already exists`);
          } else {
            showError(
              primaryError?.message ||
                inviteError.message ||
                "Failed to invite user"
            );
          }
        } else {
          showError(
            inviteError?.message ||
              action.error?.message ||
              "Failed to invite user"
          );
        }
        break;

      case "users/resendInvite/rejected":
        const resendError = action.payload;
        if (Array.isArray(resendError) && resendError[0]?.message) {
          showError(resendError[0].message);
        } else {
          showError(
            resendError?.message ||
              action.error?.message ||
              "Failed to resend invitation"
          );
        }
        break;

      case "users/resetUserPassword/rejected":
        const resetError = action.payload;
        if (Array.isArray(resetError) && resetError[0]?.message) {
          showError(resetError[0].message);
        } else {
          showError(
            resetError?.message ||
              action.error?.message ||
              "Failed to send password reset link"
          );
        }
        break;

      case "users/fetchPermissions/rejected":
        showError("Failed to load permissions data");
        break;

      // ===== CUSTOMERS SLICE ERRORS =====

      case "customers/fetchCustomers/rejected":
        showError("Failed to load customers. Please refresh and try again.");
        break;

      case "customers/searchCustomers/rejected":
        const customerSearchError =
          action.error?.message || action.payload?.message;
        if (customerSearchError?.includes("Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again."
          );
        } else {
          showError("Customer search failed. Please try again.");
        }
        break;

      case "customers/filterCustomers/rejected":
        const customerFilterError =
          action.error?.message || action.payload?.message || action.payload;
        if (
          customerFilterError?.includes("Validation failed") ||
          customerFilterError?.includes("validation")
        ) {
          showError("Invalid filter parameters. Please check your input.");
        } else if (
          customerFilterError?.includes("Use either quickRange OR custom dates")
        ) {
          showError("Please use either quick range or custom dates, not both.");
        } else {
          showError("Failed to filter customers. Please try again.");
        }
        break;

      case "customers/updateCustomer/rejected":
        const updateCustomerError =
          action.error?.message || action.payload?.message;
        if (updateCustomerError?.includes("not found")) {
          showError("Customer not found. Please refresh the page.");
        } else if (
          updateCustomerError?.includes("duplicate") ||
          updateCustomerError?.includes("already exists")
        ) {
          showError("Update failed: Email or phone number already in use");
        } else if (updateCustomerError?.includes("validation")) {
          showError("Invalid data provided. Please check your input.");
        } else {
          showError(updateCustomerError || "Failed to update customer");
        }
        break;

      case "customers/addNewUser/rejected":
        const addNewUserError = action.payload;
        const addUserErrorStr =
          addNewUserError?.message?.details?.errors?.join(",") || "N/A";
        if (addNewUserError?.type === "duplicate_data") {
          showError(`Customer already exists: ${addUserErrorStr}`);
        } else if (addNewUserError?.type === "validation_error") {
          showError(`Invalid data: ${addUserErrorStr}`);
        } else if (addNewUserError?.type === "server_error") {
          showError("Server error occurred. Please try again later.");
        } else if (addNewUserError?.type === "network_error") {
          showError(
            "Network error. Please check your connection and try again."
          );
        } else {
          showError(
            addUserErrorStr ||
              action.error?.message ||
              "Failed to add new customer"
          );
        }
        break;

      // ===== COMMISSIONS SLICE ERRORS =====

      case "commissions/fetchCommissions/rejected":
        showError("Failed to load commissions. Please refresh and try again.");
        break;

      case "commissions/searchCommissions/rejected":
        const searchError = action.error?.message || action.payload?.message;
        if (searchError?.includes("Unsupported search format")) {
          showError(
            "Invalid search format. Please check your input and try again."
          );
        } else {
          showError("Commission search failed. Please try again.");
        }
        break;

      case "commissions/filterCommissions/rejected":
        const filterError =
          action.error?.message || action.payload?.message || action.payload;
        if (
          filterError?.includes("Validation failed") ||
          filterError?.includes("validation")
        ) {
          showError("Invalid filter parameters. Please check your input.");
        } else if (
          filterError?.includes("Use either quickRange OR custom dates")
        ) {
          showError("Please use either quick range or custom dates, not both.");
        } else {
          showError("Failed to filter commissions. Please try again.");
        }
        break;

      case "commissions/updateStatus/rejected":
        const statusError = action.error?.message || action.payload?.message;
        if (statusError?.includes("not found")) {
          showError(
            "Some commissions were not found. Please refresh and try again."
          );
        } else if (statusError?.includes("validation")) {
          showError(
            "Invalid request. Please check your selection and try again."
          );
        } else {
          showError(statusError || "Failed to update commission status");
        }
        break;

      // ===== INFLUENCERS SLICE ERRORS =====

      case "influencers/fetchInfluencers/rejected":
        showError("Failed to load influencers. Please refresh and try again.");
        break;

      case "influencers/searchInfluencers/rejected":
        const influencerSearchError =
          action.error?.message || action.payload?.message;
        if (influencerSearchError?.includes("Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again."
          );
        } else {
          showError("Influencer search failed. Please try again.");
        }
        break;

      case "influencers/filterInfluencers/rejected":
        const influencerFilterError =
          action.error?.message || action.payload?.message;
        if (influencerFilterError?.includes("validation")) {
          showError("Invalid filter parameters. Please check your input.");
        } else {
          showError("Failed to filter influencers. Please try again.");
        }
        break;

      case "influencers/addNewInfluencer/rejected":
        const addInfluencerError = action.payload;

        if (addInfluencerError?.type === "duplicate_data") {
          showError(`Influencer already exists: ${addInfluencerError.message}`);
        } else if (addInfluencerError?.type === "validation_error") {
          showError(`Invalid data: ${addInfluencerError.message}`);
        } else if (addInfluencerError?.type === "server_error") {
          showError("Server error occurred. Please try again later.");
        } else if (addInfluencerError?.type === "network_error") {
          showError(
            "Network error. Please check your connection and try again."
          );
        } else {
          showError(
            addInfluencerError?.message ||
              action.error?.message ||
              "Failed to add new influencer"
          );
        }
        break;

      case "influencers/updateInfluencer/rejected":
        const updateInfluencerError =
          action.error?.message || action.payload?.message;
        if (updateInfluencerError?.includes("not found")) {
          showError("Influencer not found. Please refresh the page.");
        } else if (updateInfluencerError?.includes("duplicate")) {
          showError(
            "Update failed: Data already exists for another influencer"
          );
        } else {
          showError(updateInfluencerError || "Failed to update influencer");
        }
        break;

      case "influencers/deleteInfluencer/rejected":
        const deleteInfluencerError =
          action.error?.message || action.payload?.message;
        if (deleteInfluencerError?.includes("not found")) {
          showError("Influencer not found. Please refresh the page.");
        } else if (deleteInfluencerError?.includes("associated")) {
          showError("Cannot delete influencer: Has associated data");
        } else {
          showError(deleteInfluencerError || "Failed to delete influencer");
        }
        break;

      // ===== SERVICES SLICE ERRORS =====

      case "services/fetchBookings/rejected":
        showError("Failed to load bookings. Please refresh and try again.");
        break;

      case "services/searchBookings/rejected":
        const servicesSearchError =
          action.error?.message || action.payload?.message;
        if (servicesSearchError?.includes("Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again."
          );
        } else {
          showError("Booking search failed. Please try again.");
        }
        break;

      case "services/filterBookings/rejected":
        const servicesFilterError =
          action.error?.message || action.payload?.message || action.payload;
        if (
          servicesFilterError?.includes("Validation failed") ||
          servicesFilterError?.includes("validation")
        ) {
          showError("Invalid filter parameters. Please check your input.");
        } else if (
          servicesFilterError?.includes("Use either quickRange OR custom dates")
        ) {
          showError("Please use either quick range or custom dates, not both.");
        } else {
          showError("Failed to filter bookings. Please try again.");
        }
        break;

      // Default error handler for all slices
      default:
        if (action.type.startsWith("services/")) {
          const errMsg =
            action.error?.message ||
            action.payload?.message ||
            (Array.isArray(action.payload)
              ? action.payload[0]?.message
              : null) ||
            "Booking operation failed";
          showError(errMsg);
        } else if (action.type.startsWith("customers/")) {
          const errMsg =
            action.error?.message ||
            action.payload?.message ||
            (Array.isArray(action.payload)
              ? action.payload[0]?.message
              : null) ||
            "Customer operation failed";
          showError(errMsg);
        } else if (action.type.startsWith("influencers/")) {
          const errMsg =
            action.error?.message ||
            action.payload?.message ||
            (Array.isArray(action.payload)
              ? action.payload[0]?.message
              : null) ||
            "Influencer operation failed";
          showError(errMsg);
        } else if (action.type.startsWith("commissions/")) {
          const errMsg =
            action.error?.message ||
            action.payload?.message ||
            (Array.isArray(action.payload)
              ? action.payload[0]?.message
              : null) ||
            "Commission operation failed";
          showError(errMsg);
        } else if (action.type.startsWith("users/")) {
          // Default error handler for users slice
          const errMsg =
            action.error?.message ||
            action.payload?.message ||
            (Array.isArray(action.payload)
              ? action.payload[0]?.message
              : null) ||
            "Operation failed";
          showError(errMsg);
        }
        break;
    }
  }

  // Pending messages (only for operations that benefit from loading indicators)
  if (action.type.endsWith("/pending")) {
    switch (action.type) {
      // ===== USERS SLICE PENDING =====

      // Show loading for operations that take longer time
      case "users/inviteUser/pending":
        showInfo("Sending invitation...");
        break;

      case "users/resendInvite/pending":
        showInfo("Resending invitation...");
        break;

      case "users/resetUserPassword/pending":
        showInfo("Sending password reset link...");
        break;

      case "users/updateUserPermissions/pending":
        showInfo("Updating permissions...");
        break;

      case "users/deleteUser/pending":
        showInfo("Deleting user...");
        break;

      // ===== CUSTOMERS SLICE PENDING =====

      case "customers/updateCustomer/pending":
        showInfo("Updating customer details...");
        break;

      case "customers/addNewUser/pending":
        showInfo("Adding new customer...");
        break;

      case "customers/filterCustomers/pending":
        // Only show pending for export operations
        const customerFilterMeta = action.meta?.arg;
        if (customerFilterMeta?.mode === "export") {
          showInfo("Preparing customer export data...");
        }
        break;

      // ===== COMMISSIONS SLICE PENDING =====

      case "commissions/updateStatus/pending":
        showInfo("Updating commission status...");
        break;

      // ===== INFLUENCERS SLICE PENDING =====

      case "influencers/addNewInfluencer/pending":
        showInfo("Adding new influencer...");
        break;

      case "influencers/updateInfluencer/pending":
        showInfo("Updating influencer...");
        break;

      case "influencers/deleteInfluencer/pending":
        showInfo("Deleting influencer...");
        break;

      case "influencers/filterInfluencers/pending":
        // Only show pending for export operations
        const filterMeta = action.meta?.arg;
        if (filterMeta?.mode === "export") {
          showInfo("Preparing export data...");
        }
        break;

      // ===== SERVICES SLICE PENDING =====

      case "services/filterBookings/pending":
        // Only show pending for export operations
        const servicesFilterMeta = action.meta?.arg;
        if (servicesFilterMeta?.mode === "export") {
          showInfo("Preparing booking export data...");
        }
        break;

      // ===== COUPONS SLICE PENDING =====

      case "coupons/createCoupon/pending":
        showInfo("Creating coupon...");
        break;

      case "coupons/updateCoupon/pending":
        showInfo("Updating coupon...");
        break;

      case "coupons/deleteCoupon/pending":
        showInfo("Deleting coupon...");
        break;

      // No pending messages for these operations (they should be fast/silent)
      case "users/fetchUsers/pending":
      case "users/searchUsers/pending":
      case "users/fetchPermissions/pending":
      case "users/updateUser/pending":
      case "customers/fetchCustomers/pending":
      case "customers/searchCustomers/pending":
      case "commissions/fetchCommissions/pending":
      case "commissions/searchCommissions/pending":
      case "commissions/filterCommissions/pending":
      case "influencers/fetchInfluencers/pending":
      case "influencers/searchInfluencers/pending":
      case "services/fetchBookings/pending":
      case "services/searchBookings/pending":
      case "payments/fetchBalanceSummary/pending":
      case "payments/fetchDowntimeStatus/pending":
      case "payments/fetchPayments/pending":
      case "payments/fetchPaymentsWithDateFilter/pending":
      case "payments/fetchRefunds/pending":
      case "payments/fetchRefundsWithDateFilter/pending":
      case "payments/fetchRefundsByPaymentId/pending":
      case "payments/fetchSettlements/pending":
      case "payments/fetchSettlementsWithDateFilter/pending":
      case "coupons/fetchCoupons/pending":
      case "coupons/searchCoupons/pending":
      case "coupons/searchCouponsByDateRange/pending":
      case "coupons/fetchServices/pending":
      case "coupons/searchInfluencer/pending":
        // No toast - these operations should be silent while pending
        break;

      default:
        break;
    }
  }

  return next(action);
};

export default toastMiddleware;