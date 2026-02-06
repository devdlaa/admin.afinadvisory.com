import {
  showSuccess,
  showError,
  showInfo,
} from "@/app/components/toastService";

// Helper function to safely check if a string includes a substring
const safeIncludes = (str, searchString) => {
  if (typeof str !== "string") {
    return false;
  }
  return str.includes(searchString);
};

// Helper function to safely get error message
const getErrorMessage = (action) => {
  // Try different paths where error message might be
  const possibleMessages = [
    action.payload?.message,
    action.error?.message,
    action.payload,
    action.error,
  ];

  for (const msg of possibleMessages) {
    if (typeof msg === "string" && msg.length > 0) {
      return msg;
    }
  }

  return null;
};

// Helper to extract message from array payload
const getArrayErrorMessage = (payload) => {
  if (Array.isArray(payload) && payload.length > 0 && payload[0]?.message) {
    return payload[0].message;
  }
  return null;
};

const toastMiddleware = () => (next) => (action) => {
  // Success messages
  if (action.type.endsWith("/fulfilled")) {
    switch (action.type) {
      // ===== TASK SLICE =====

      case "task/createTask/fulfilled":
        const newTask = action.payload;
        const taskTitle = newTask?.title || "Task";
        showSuccess(`"${taskTitle}" created successfully`);
        break;

      case "task/updateTask/fulfilled":
        showSuccess("Task updated successfully");
        break;

      case "task/deleteTask/fulfilled":
        showSuccess("Task deleted successfully");
        break;

      case "task/bulkUpdateTaskStatus/fulfilled":
        const statussPayload = action.payload;
        const statusCount = statussPayload?.updated_task_ids?.length || 0;
        showSuccess(
          `${statusCount} task${
            statusCount !== 1 ? "s" : ""
          } status updated successfully`,
        );
        break;

      case "task/bulkUpdateTaskPriority/fulfilled":
        const priorityPayload = action.payload;
        const priorityCount = priorityPayload?.updated_task_ids?.length || 0;
        showSuccess(
          `${priorityCount} task${
            priorityCount !== 1 ? "s" : ""
          } priority updated successfully`,
        );
        break;

      case "task/bulkAssignTasks/fulfilled":
        showSuccess("Tasks assigned successfully");
        break;

      // ===== TASK DETAILS SLICE =====

      case "taskDetail/addCharge/fulfilled":
        showSuccess("Charge added successfully");
        break;

      case "taskDetail/updateCharge/fulfilled":
        showSuccess("Charge updated successfully");
        break;

      case "taskDetail/deleteCharge/fulfilled":
        showSuccess("Charge deleted successfully");
        break;

      case "taskDetail/syncChecklist/fulfilled":
        showSuccess("Checklist saved successfully");
        break;

      case "taskDetail/syncAssignments/fulfilled":
        showSuccess("Task assignments updated successfully");
        break;

      // ===== TASK CATEGORY SLICE =====

      case "taskCategory/createCategory/fulfilled":
        const newCategory = action.payload;
        const categoryName = newCategory?.name || "Category";
        showSuccess(`Category "${categoryName}" created successfully`);
        break;

      case "taskCategory/updateCategory/fulfilled":
        showSuccess("Category updated successfully");
        break;

      case "taskCategory/deleteCategory/fulfilled":
        showSuccess("Category deleted successfully");
        break;

      // ===== TASK TIMELINE SLICE =====

      case "taskTimeline/createComment/fulfilled":
        showSuccess("Comment added successfully");
        break;

      case "taskTimeline/updateComment/fulfilled":
        showSuccess("Comment updated successfully");
        break;

      case "taskTimeline/deleteComment/fulfilled":
        showSuccess("Comment deleted successfully");
        break;

      case "charges/addToTask/fulfilled":
        showSuccess("Charge added successfully");
        break;

      case "charges/updateCharge/fulfilled":
        showSuccess("Charge updated successfully");
        break;

      case "charges/deleteCharge/fulfilled":
        showSuccess("Charge deleted successfully");
        break;

      case "charges/bulkUpdate/fulfilled":
        showSuccess("Charges updated successfully");
        break;

      case "charges/bulkUpdateStatus/fulfilled":
        showSuccess("Charge status updated successfully");
        break;

      case "reconcile/fetchUnreconciled/fulfilled":
      case "reconcile/fetchNonBillable/fulfilled":
      case "invoice/fetchList/fulfilled":
      case "invoice/fetchReconciled/fulfilled":
      case "invoice/fetchDetails/fulfilled":
        // Silent operations - no toast
        break;

      // Create or Append Invoice
      case "invoice/createOrAppend/fulfilled":
        const invoicePayload = action.payload;
        const invoiceNumber =
          invoicePayload?.invoice?.internal_number || "Invoice";
        const wasAppended = action.meta?.arg?.invoice_internal_number;

        if (wasAppended) {
          showSuccess(`Tasks added to invoice ${invoiceNumber} successfully`);
        } else {
          showSuccess(`Invoice ${invoiceNumber} created successfully`);
        }
        break;

      // Update Invoice Info
      case "invoice/updateInfo/fulfilled":
        showSuccess("Invoice updated successfully");
        break;

      // Update Invoice Status (Single)
      case "invoice/updateStatus/fulfilled":
        const statusUpdatePayload = action.payload;
        const newInvStatus = statusUpdatePayload?.status || "updated";
        showSuccess(`Invoice status updated to ${newInvStatus}`);
        break;

      // Bulk Update Invoice Status
      case "invoice/bulkUpdateStatus/fulfilled":
        const bulkInvoiceResult = action.payload?.result;
        const successCount = bulkInvoiceResult?.success?.length || 0;
        const rejectedCount = bulkInvoiceResult?.rejected?.length || 0;

        if (successCount > 0 && rejectedCount > 0) {
          showSuccess(
            `${successCount} invoice${successCount !== 1 ? "s" : ""} updated successfully. ${rejectedCount} invoice${rejectedCount !== 1 ? "s" : ""} could not be updated.`,
          );
        } else if (successCount > 0) {
          showSuccess(
            `${successCount} invoice${successCount !== 1 ? "s" : ""} updated successfully`,
          );
        } else if (rejectedCount > 0) {
          const rejectedReasons = bulkInvoiceResult.rejected
            .map((r) => r.reason || "unknown reason")
            .join(", ");
          showInfo(`No invoices were updated. Reasons: ${rejectedReasons}`);
        }
        break;

      // Unlink Tasks from Invoice
      case "invoice/unlinkTasks/fulfilled":
        const unlinkPayload = action.payload;
        const unlinkedTaskCount = unlinkPayload?.taskIds?.length || 0;
        showSuccess(
          `${unlinkedTaskCount} task${unlinkedTaskCount !== 1 ? "s" : ""} removed from invoice successfully`,
        );
        break;

      // Silent operations (no toast needed)
      case "task/fetchTasks/fulfilled":
      case "task/fetchAssignmentReport/fulfilled":
      case "taskDetail/fetchTaskById/fulfilled":
      case "taskCategory/fetchCategories/fulfilled":
      case "taskCategory/quickSearchCategories/fulfilled":
      case "taskCategory/fetchCategoryById/fulfilled":
      case "taskTimeline/fetchTimeline/fulfilled":
      case "taskTimeline/loadMoreTimeline/fulfilled":
        // No toast - these are silent background operations
        break;

      case "reconcile/markNonBillable/fulfilled":
        const markNonBillableResult = action.payload?.result;
        const updatedCountReconcile =
          markNonBillableResult?.updated?.length || 0;
        const rejectedCountReconcile =
          markNonBillableResult?.rejected?.length || 0;

        if (updatedCountReconcile > 0 && rejectedCountReconcile > 0) {
          showSuccess(
            `${updatedCountReconcile} task${updatedCountReconcile !== 1 ? "s" : ""} marked as non-billable. ${rejectedCountReconcile} task${rejectedCountReconcile !== 1 ? "s" : ""} could not be updated.`,
          );
        } else if (updatedCountReconcile > 0) {
          showSuccess(
            `${updatedCountReconcile} task${updatedCountReconcile !== 1 ? "s" : ""} marked as non-billable successfully`,
          );
        } else if (rejectedCountReconcile > 0) {
          const rejectedReasons = markNonBillableResult.rejected
            .map((r) => {
              const reason =
                r.reason === "SYSTEM_TASK"
                  ? "system task"
                  : r.reason === "HAS_UNPAID_CHARGES"
                    ? "has unpaid charges"
                    : "unknown reason";
              return reason;
            })
            .join(", ");
          showInfo(
            `No tasks were marked as non-billable. Reasons: ${rejectedReasons}`,
          );
        }
        break;

      case "reconcile/restoreBillable/fulfilled":
        const restoreBillableResult = action.payload?.result;
        const restoredCount = restoreBillableResult?.restored?.length || 0;
        const restoredRejectedCount =
          restoreBillableResult?.rejected?.length || 0;

        if (restoredCount > 0 && restoredRejectedCount > 0) {
          showSuccess(
            `${restoredCount} task${restoredCount !== 1 ? "s" : ""} restored to billable. ${restoredRejectedCount} task${restoredRejectedCount !== 1 ? "s" : ""} could not be updated.`,
          );
        } else if (restoredCount > 0) {
          showSuccess(
            `${restoredCount} task${restoredCount !== 1 ? "s" : ""} restored to billable successfully`,
          );
        } else if (restoredRejectedCount > 0) {
          const rejectedReasons = restoreBillableResult.rejected
            .map((r) => {
              const reason =
                r.reason === "ALREADY_BILLABLE"
                  ? "already billable"
                  : r.reason === "NOT_FOUND"
                    ? "not found"
                    : "unknown reason";
              return reason;
            })
            .join(", ");
          showInfo(`No tasks were restored. Reasons: ${rejectedReasons}`);
        }
        break;

      case "reconcile/createAdHocCharge/fulfilled":
        showSuccess("Ad-hoc charge created successfully");
        break;

      case "reconcile/deleteAdHocCharge/fulfilled":
        showSuccess("Ad-hoc charge deleted successfully");
        break;

      // ===== USERS SLICE =====

      case "users/fetchUsers/fulfilled":
      case "users/searchUsers/fulfilled":
      case "users/fetchPermissions/fulfilled":
        // Silent operations
        break;

      case "users/updateUser/fulfilled":
        showSuccess("User profile updated successfully");
        break;

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
            } assigned)`,
          );
        } else {
          showSuccess("User permissions updated successfully");
        }
        break;

      case "users/inviteUser/fulfilled":
        const invitePayload = action.payload;
        if (invitePayload?.data?.emailSent) {
          showSuccess("User invited successfully! Invitation email sent.");
        } else if (invitePayload?.data?.warning) {
          showInfo(
            "User created but invitation email could not be sent. Please resend manually.",
          );
        } else {
          showSuccess("User invitation processed successfully");
        }
        break;

      case "users/resendInvite/fulfilled":
        showSuccess("Invitation resent successfully");
        break;

      case "users/resetUserOnboarding/fulfilled":
        const resetPayload = action.payload;
        if (resetPayload?.data?.emailSent) {
          showSuccess("Onboarding reset link sent successfully");
        } else {
          showInfo("Onboarding reset processed but email could not be sent");
        }
        break;

      case "users/sendPasswordResetLink/fulfilled":
        const resetPasswordLinkPayload = action.payload;
        if (resetPasswordLinkPayload?.success) {
          showSuccess("Password reset link sent successfully");
        } else {
          showInfo("Password reset processed but email could not be sent");
        }
        break;

      case "users/deleteUser/fulfilled":
        showSuccess("User deleted successfully");
        break;

      // ===== CUSTOMERS SLICE =====

      case "customers/fetchCustomers/fulfilled":
      case "customers/searchCustomers/fulfilled":
        // Silent operations
        break;

      case "customers/filterCustomers/fulfilled":
        const customerFilterPayload = action.payload;
        if (customerFilterPayload?.mode === "export") {
          const exportCount = customerFilterPayload?.resultsCount || 0;
          showSuccess(
            `Export data prepared: ${exportCount} customer${
              exportCount !== 1 ? "s" : ""
            } ready for download`,
          );
        }
        break;

      case "customers/updateCustomer/fulfilled":
        const updateCustomerPayload = action.payload;
        const customerName =
          updateCustomerPayload?.updatedCustomer?.name ||
          updateCustomerPayload?.updatedCustomer?.email ||
          updateCustomerPayload?.updatedCustomer?.phone ||
          "Customer";
        showSuccess(`${customerName} updated successfully`);
        break;

      case "customers/addNewUser/fulfilled":
        const newUserPayload = action.payload;
        const newUserName =
          newUserPayload?.newUser?.name ||
          newUserPayload?.newUser?.email ||
          newUserPayload?.newUser?.phone ||
          "User";

        if (newUserPayload?.passwordResetLink) {
          showSuccess(
            `${newUserName} added successfully! Password reset link generated.`,
          );
        } else {
          showSuccess(`${newUserName} added successfully`);
        }
        break;

      // ===== COMMISSIONS SLICE =====

      case "commissions/fetchCommissions/fulfilled":
      case "commissions/searchCommissions/fulfilled":
      case "commissions/filterCommissions/fulfilled":
        // Silent operations
        break;

      case "commissions/updateStatus/fulfilled":
        const statusPayload = action.payload;
        const { updatedCount, skippedCount, newStatus } = statusPayload || {};

        if (updatedCount > 0 && skippedCount > 0) {
          showSuccess(
            `${updatedCount} commission${
              updatedCount !== 1 ? "s" : ""
            } marked as ${newStatus}. ${skippedCount} already had this status.`,
          );
        } else if (updatedCount > 0) {
          showSuccess(
            `${updatedCount} commission${
              updatedCount !== 1 ? "s" : ""
            } marked as ${newStatus} successfully`,
          );
        } else if (skippedCount > 0) {
          showInfo(`All selected commissions already have ${newStatus} status`);
        } else {
          showSuccess("Commission status updated successfully");
        }
        break;

      // ===== INFLUENCERS SLICE =====

      case "influencers/fetchInfluencers/fulfilled":
      case "influencers/searchInfluencers/fulfilled":
        // Silent operations
        break;

      case "influencers/filterInfluencers/fulfilled":
        const filterPayload = action.payload;
        if (filterPayload?.mode === "export") {
          const exportCount = filterPayload?.resultsCount || 0;
          showSuccess(
            `Export data prepared: ${exportCount} influencer${
              exportCount !== 1 ? "s" : ""
            } ready for download`,
          );
        }
        break;

      case "influencers/addNewInfluencer/fulfilled":
        const newInfluencerPayload = action.payload;
        const influencerName =
          newInfluencerPayload?.newInfluencer?.name ||
          newInfluencerPayload?.newInfluencer?.username ||
          "Influencer";
        showSuccess(`${influencerName} added successfully`);
        break;

      case "influencers/updateInfluencer/fulfilled":
        const updatePayload = action.payload;
        const updatedInfluencerName =
          updatePayload?.updatedInfluencer?.data?.name ||
          updatePayload?.updatedInfluencer?.data?.username ||
          "Influencer";
        showSuccess(`${updatedInfluencerName} updated successfully`);
        break;

      case "influencers/deleteInfluencer/fulfilled":
        showSuccess("Influencer deleted successfully");
        break;

      // ===== SERVICES SLICE =====

      case "services/fetchBookings/fulfilled":
      case "services/searchBookings/fulfilled":
        // Silent operations
        break;

      case "services/filterBookings/fulfilled":
        const servicesFilterPayload = action.payload;
        if (servicesFilterPayload?.mode === "export") {
          const exportCount = servicesFilterPayload?.resultsCount || 0;
          showSuccess(
            `Export data prepared: ${exportCount} booking${
              exportCount !== 1 ? "s" : ""
            } ready for download`,
          );
        }
        break;

      // ===== ENTITY SLICE =====

      case "entity/fetchEntities/fulfilled":
      case "entity/quickSearchEntities/fulfilled":
      case "entity/fetchEntityById/fulfilled":
        // Silent operations
        break;

      case "entity/createEntity/fulfilled":
        const newEntity = action.payload;
        const entityName = newEntity?.name || "Entity";
        showSuccess(`${entityName} created successfully`);
        break;

      case "entity/updateEntity/fulfilled":
        const updatedEntity = action.payload;
        const updatedEntityName = updatedEntity?.name || "Entity";
        showSuccess(`${updatedEntityName} updated successfully`);
        break;

      case "entity/deleteEntity/fulfilled":
        showSuccess("Entity deleted successfully");
        break;

      default:
        break;
    }
  }

  // Error messages
  if (action.type.endsWith("/rejected")) {
    switch (action.type) {
      case "task/fetchAssignmentReport/rejected":
        const assignmentReportError = getErrorMessage(action);
        if (safeIncludes(assignmentReportError, "unauthorized")) {
          showError("You don't have permission to view workload data");
        } else if (safeIncludes(assignmentReportError, "no data")) {
          showInfo("No assignment data available yet");
        } else {
          showError("Failed to load workload data. Please try again.");
        }
        break;

      // ===== TASK SLICE ERRORS =====

      case "task/fetchTasks/rejected":
        showError("Failed to load tasks. Please refresh and try again.");
        break;

      case "task/createTask/rejected":
        const createTaskError = getErrorMessage(action);
        if (safeIncludes(createTaskError, "validation")) {
          showError("Invalid task data. Please check your input.");
        } else {
          showError(createTaskError || "Failed to create task");
        }
        break;

      case "task/updateTask/rejected":
        const updateTaskError = getErrorMessage(action);
        if (safeIncludes(updateTaskError, "not found")) {
          showError("Task not found. Please refresh the page.");
        } else {
          showError(updateTaskError || "Failed to update task");
        }
        break;

      case "task/deleteTask/rejected":
        const deleteTaskError = getErrorMessage(action);
        showError(deleteTaskError || "Failed to delete task");
        break;

      case "task/bulkUpdateTaskStatus/rejected":
        showError("Failed to update task statuses. Please try again.");
        break;

      case "task/bulkUpdateTaskPriority/rejected":
        showError("Failed to update task priorities. Please try again.");
        break;

      case "task/bulkAssignTasks/rejected":
        showError("Failed to assign tasks. Please try again.");
        break;

      // ===== TASK DETAILS SLICE ERRORS =====

      case "taskDetail/fetchTaskById/rejected":
        const fetchTaskError = getErrorMessage(action);
        if (safeIncludes(fetchTaskError, "not found")) {
          showError("Task not found. Please refresh the page.");
        } else {
          showError("Failed to load task details. Please try again.");
        }
        break;

      case "taskDetail/addCharge/rejected":
        const addChargeError = getErrorMessage(action);
        if (safeIncludes(addChargeError, "validation")) {
          showError("Invalid charge data. Please check your input.");
        } else {
          showError(addChargeError || "Failed to add charge");
        }
        break;

      case "taskDetail/updateCharge/rejected":
        const updateChargeError = getErrorMessage(action);
        showError(updateChargeError || "Failed to update charge");
        break;

      case "taskDetail/deleteCharge/rejected":
        showError("Failed to delete charge. Please try again.");
        break;

      case "taskDetail/syncChecklist/rejected":
        showError("Failed to save checklist. Please try again.");
        break;

      case "taskDetail/syncAssignments/rejected":
        const syncAssignmentsError = getErrorMessage(action);
        if (safeIncludes(syncAssignmentsError, "not found")) {
          showError("Some users were not found. Please refresh and try again.");
        } else {
          showError(syncAssignmentsError || "Failed to update assignments");
        }
        break;

      // ===== TASK CATEGORY SLICE ERRORS =====

      case "taskCategory/fetchCategories/rejected":
        showError("Failed to load categories. Please refresh and try again.");
        break;

      case "taskCategory/createCategory/rejected":
        const createCategoryError = getErrorMessage(action);
        if (
          safeIncludes(createCategoryError, "already exists") ||
          safeIncludes(createCategoryError, "duplicate")
        ) {
          showError("Category with this name already exists");
        } else if (safeIncludes(createCategoryError, "validation")) {
          showError("Invalid category data. Please check your input.");
        } else {
          showError(createCategoryError || "Failed to create category");
        }
        break;

      case "taskCategory/updateCategory/rejected":
        const updateCategoryError = getErrorMessage(action);
        if (safeIncludes(updateCategoryError, "not found")) {
          showError("Category not found. Please refresh the page.");
        } else {
          showError(updateCategoryError || "Failed to update category");
        }
        break;

      case "taskCategory/deleteCategory/rejected":
        const deleteCategoryError = getErrorMessage(action);
        if (
          safeIncludes(deleteCategoryError, "in use") ||
          safeIncludes(deleteCategoryError, "associated")
        ) {
          showError("Cannot delete category: It's being used by tasks");
        } else {
          showError(deleteCategoryError || "Failed to delete category");
        }
        break;

      // ===== TASK TIMELINE SLICE ERRORS =====

      case "taskTimeline/fetchTimeline/rejected":
        showError("Failed to load activity timeline. Please try again.");
        break;

      case "taskTimeline/loadMoreTimeline/rejected":
        showError("Failed to load more items. Please try again.");
        break;

      case "taskTimeline/createComment/rejected":
        const createCommentError = getErrorMessage(action);
        if (safeIncludes(createCommentError, "validation")) {
          showError("Invalid comment. Please check your input.");
        } else {
          showError(createCommentError || "Failed to add comment");
        }
        break;

      case "taskTimeline/updateComment/rejected":
        showError("Failed to update comment. Please try again.");
        break;

      case "taskTimeline/deleteComment/rejected":
        showError("Failed to delete comment. Please try again.");
        break;

      // ===== USERS SLICE ERRORS =====

      case "users/fetchUsers/rejected":
        showError("Failed to load users. Please refresh and try again.");
        break;

      case "users/searchUsers/rejected":
        showError("Search failed. Please try again.");
        break;

      case "users/updateUser/rejected":
        const updateError = getErrorMessage(action);
        if (
          safeIncludes(updateError, "already exists") ||
          safeIncludes(updateError, "duplicate")
        ) {
          showError("Update failed: Email or phone number already in use");
        } else if (safeIncludes(updateError, "not found")) {
          showError("User not found. Please refresh the page.");
        } else {
          showError(updateError || "Failed to update user profile");
        }
        break;

      case "users/deleteUser/rejected":
        const deleteError =
          getArrayErrorMessage(action.payload) || getErrorMessage(action);
        showError(deleteError || "Failed to delete user");
        break;

      case "users/updateUserPermissions/rejected":
        const permError = getErrorMessage(action);
        if (safeIncludes(permError, "permission")) {
          showError("Insufficient permissions to update user roles");
        } else {
          showError(permError || "Failed to update user permissions");
        }
        break;

      case "users/inviteUser/rejected":
        const inviteError = action.payload;
        if (inviteError?.errors && Array.isArray(inviteError.errors)) {
          const primaryError =
            inviteError.errors.find((err) => err.field === "email") ||
            inviteError.errors.find((err) => err.field === "phone") ||
            inviteError.errors[0];

          const errMsg = primaryError?.message || "";
          if (safeIncludes(errMsg, "already exists")) {
            showError(`User with this ${primaryError.field} already exists`);
          } else {
            showError(errMsg || inviteError.message || "Failed to invite user");
          }
        } else {
          const msg =
            inviteError?.message ||
            action.error?.message ||
            "Failed to invite user";
          showError(msg);
        }
        break;

      case "users/resendInvite/rejected":
        const resendError =
          getArrayErrorMessage(action.payload) || getErrorMessage(action);
        showError(resendError || "Failed to resend invitation");
        break;

      case "users/resetUserOnboarding/rejected":
        const resetError =
          getArrayErrorMessage(action.payload) || getErrorMessage(action);
        showError(resetError || "Failed to send Onboarding reset link");
        break;

      case "users/sendPasswordResetLink/rejected":
        const sendPasswordResetLinkErr =
          getArrayErrorMessage(action.payload) || getErrorMessage(action);
        showError(
          sendPasswordResetLinkErr || "Failed to send Password reset link",
        );
        break;

      case "users/toggleUserStatus/rejected":
        const toggleStatusError =
          getArrayErrorMessage(action.payload) || getErrorMessage(action);
        showError(toggleStatusError || "Failed to Update Account Status");
        break;

      case "users/fetchPermissions/rejected":
        showError("Failed to load permissions data");
        break;

      // ===== CUSTOMERS SLICE ERRORS =====

      case "customers/fetchCustomers/rejected":
        showError("Failed to load customers. Please refresh and try again.");
        break;

      case "customers/searchCustomers/rejected":
        const customerSearchError = getErrorMessage(action);
        if (safeIncludes(customerSearchError, "Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again.",
          );
        } else {
          showError("Customer search failed. Please try again.");
        }
        break;

      case "customers/filterCustomers/rejected":
        const customerFilterError = getErrorMessage(action);
        if (
          safeIncludes(customerFilterError, "Validation failed") ||
          safeIncludes(customerFilterError, "validation")
        ) {
          showError("Invalid filter parameters. Please check your input.");
        } else if (
          safeIncludes(
            customerFilterError,
            "Use either quickRange OR custom dates",
          )
        ) {
          showError("Please use either quick range or custom dates, not both.");
        } else {
          showError("Failed to filter customers. Please try again.");
        }
        break;

      case "customers/updateCustomer/rejected":
        const updateCustomerErrorRaw = action.payload?.message?.details?.errors;
        const updateCustomerError = Array.isArray(updateCustomerErrorRaw)
          ? updateCustomerErrorRaw.join(", ")
          : typeof updateCustomerErrorRaw === "string"
            ? updateCustomerErrorRaw
            : getErrorMessage(action);

        if (safeIncludes(updateCustomerError, "not found")) {
          showError("Customer not found. Please refresh the page.");
        } else if (
          safeIncludes(updateCustomerError, "duplicate") ||
          safeIncludes(updateCustomerError, "already exists")
        ) {
          showError("Update failed: Email or phone number already in use");
        } else if (safeIncludes(updateCustomerError, "validation")) {
          showError("Invalid data provided. Please check your input.");
        } else {
          showError(updateCustomerError || "Failed to update customer");
        }
        break;

      case "customers/addNewUser/rejected":
        const addNewUserError = action.payload;
        const addUserErrors = addNewUserError?.message?.details?.errors;
        const addUserErrorStr = Array.isArray(addUserErrors)
          ? addUserErrors.join(", ")
          : typeof addUserErrors === "string"
            ? addUserErrors
            : "";

        if (addNewUserError?.type === "duplicate_data") {
          showError(
            `Customer already exists: ${addUserErrorStr || "Duplicate data"}`,
          );
        } else if (addNewUserError?.type === "validation_error") {
          showError(`Invalid data: ${addUserErrorStr || "Validation failed"}`);
        } else if (addNewUserError?.type === "server_error") {
          showError("Server error occurred. Please try again later.");
        } else if (addNewUserError?.type === "network_error") {
          showError(
            "Network error. Please check your connection and try again.",
          );
        } else {
          showError(
            addUserErrorStr ||
              action.error?.message ||
              "Failed to add new customer",
          );
        }
        break;

      // ===== COMMISSIONS SLICE ERRORS =====

      case "commissions/fetchCommissions/rejected":
        showError("Failed to load commissions. Please refresh and try again.");
        break;

      case "commissions/searchCommissions/rejected":
        const searchError = getErrorMessage(action);
        if (safeIncludes(searchError, "Unsupported search format")) {
          showError(
            "Invalid search format. Please check your input and try again.",
          );
        } else {
          showError("Commission search failed. Please try again.");
        }
        break;

      case "commissions/filterCommissions/rejected":
        const filterError = getErrorMessage(action);
        if (
          safeIncludes(filterError, "Validation failed") ||
          safeIncludes(filterError, "validation")
        ) {
          showError("Invalid filter parameters. Please check your input.");
        } else if (
          safeIncludes(filterError, "Use either quickRange OR custom dates")
        ) {
          showError("Please use either quick range or custom dates, not both.");
        } else {
          showError("Failed to filter commissions. Please try again.");
        }
        break;

      case "commissions/updateStatus/rejected":
        const statusError = getErrorMessage(action);
        if (safeIncludes(statusError, "not found")) {
          showError(
            "Some commissions were not found. Please refresh and try again.",
          );
        } else if (safeIncludes(statusError, "validation")) {
          showError(
            "Invalid request. Please check your selection and try again.",
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
        const influencerSearchError = getErrorMessage(action);
        if (safeIncludes(influencerSearchError, "Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again.",
          );
        } else {
          showError("Influencer search failed. Please try again.");
        }
        break;

      case "influencers/filterInfluencers/rejected":
        const influencerFilterError = getErrorMessage(action);
        if (safeIncludes(influencerFilterError, "validation")) {
          showError("Invalid filter parameters. Please check your input.");
        } else {
          showError("Failed to filter influencers. Please try again.");
        }
        break;

      case "influencers/addNewInfluencer/rejected":
        const addInfluencerError = action.payload;
        const addInfluencerMsg =
          addInfluencerError?.message || getErrorMessage(action);

        if (addInfluencerError?.type === "duplicate_data") {
          showError(
            `Influencer already exists: ${addInfluencerMsg || "Duplicate data"}`,
          );
        } else if (addInfluencerError?.type === "validation_error") {
          showError(`Invalid data: ${addInfluencerMsg || "Validation failed"}`);
        } else if (addInfluencerError?.type === "server_error") {
          showError("Server error occurred. Please try again later.");
        } else if (addInfluencerError?.type === "network_error") {
          showError(
            "Network error. Please check your connection and try again.",
          );
        } else {
          showError(addInfluencerMsg || "Failed to add new influencer");
        }
        break;

      case "influencers/updateInfluencer/rejected":
        const updateInfluencerError = getErrorMessage(action);
        if (safeIncludes(updateInfluencerError, "not found")) {
          showError("Influencer not found. Please refresh the page.");
        } else if (safeIncludes(updateInfluencerError, "duplicate")) {
          showError(
            "Update failed: Data already exists for another influencer",
          );
        } else {
          showError(updateInfluencerError || "Failed to update influencer");
        }
        break;

      case "influencers/deleteInfluencer/rejected":
        const deleteInfluencerError = getErrorMessage(action);
        if (safeIncludes(deleteInfluencerError, "not found")) {
          showError("Influencer not found. Please refresh the page.");
        } else if (safeIncludes(deleteInfluencerError, "associated")) {
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
        const servicesSearchError = getErrorMessage(action);
        if (safeIncludes(servicesSearchError, "Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again.",
          );
        } else {
          showError("Booking search failed. Please try again.");
        }
        break;

      case "services/filterBookings/rejected":
        const servicesFilterError = getErrorMessage(action);
        if (
          safeIncludes(servicesFilterError, "Validation failed") ||
          safeIncludes(servicesFilterError, "validation")
        ) {
          showError("Invalid filter parameters. Please check your input.");
        } else if (
          safeIncludes(
            servicesFilterError,
            "Use either quickRange OR custom dates",
          )
        ) {
          showError("Please use either quick range or custom dates, not both.");
        } else {
          showError("Failed to filter bookings. Please try again.");
        }
        break;

      // ===== ENTITY SLICE ERRORS =====

      case "entity/fetchEntities/rejected":
        showError("Failed to load entities. Please refresh and try again.");
        break;

      case "entity/quickSearchEntities/rejected":
        const quickSearchError = getErrorMessage(action);
        if (safeIncludes(quickSearchError, "Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again.",
          );
        } else {
          showError("Entity search failed. Please try again.");
        }
        break;

      case "entity/fetchEntityById/rejected":
        const fetchByIdError = getErrorMessage(action);
        if (safeIncludes(fetchByIdError, "not found")) {
          showError("Entity not found. Please refresh the page.");
        } else {
          showError(fetchByIdError || "Failed to fetch entity");
        }
        break;

      case "entity/createEntity/rejected":
        const createError = action.payload;
        const createErrorMsg = createError?.message || getErrorMessage(action);

        if (
          createError?.code === "DUPLICATE_ENTRY" ||
          safeIncludes(createErrorMsg, "already exists")
        ) {
          showError(
            `Entity creation failed: ${createErrorMsg || "Duplicate entry"}`,
          );
        } else if (createError?.code === "VALIDATION_ERROR") {
          showError(`Invalid data: ${createErrorMsg || "Validation failed"}`);
        } else {
          showError(createErrorMsg || "Failed to create entity");
        }
        break;

      case "entity/updateEntity/rejected":
        const updateEntityError = action.payload;
        const updateEntityMsg =
          updateEntityError?.message || getErrorMessage(action);

        if (safeIncludes(updateEntityMsg, "not found")) {
          showError("Entity not found. Please refresh the page.");
        } else if (
          safeIncludes(updateEntityMsg, "duplicate") ||
          safeIncludes(updateEntityMsg, "already exists")
        ) {
          showError("Update failed: Data already exists for another entity");
        } else if (updateEntityError?.code === "VALIDATION_ERROR") {
          showError("Invalid data provided. Please check your input.");
        } else {
          showError(updateEntityMsg || "Failed to update entity");
        }
        break;

      case "entity/deleteEntity/rejected":
        const deleteEntityError = action.payload;
        const deleteEntityMsg =
          deleteEntityError?.message || getErrorMessage(action);

        if (safeIncludes(deleteEntityMsg, "not found")) {
          showError("Entity not found. Please refresh the page.");
        } else if (
          safeIncludes(deleteEntityMsg, "associated") ||
          safeIncludes(deleteEntityMsg, "dependent")
        ) {
          showError(
            "Cannot delete entity: Has associated data or dependencies",
          );
        } else {
          showError(deleteEntityMsg || "Failed to delete entity");
        }
        break;

      // ===== CHARGES SLICE ERRORS =====

      case "charges/addToTask/rejected":
        const addChargeErr = getErrorMessage(action);
        if (
          safeIncludes(addChargeErr, "validation") ||
          safeIncludes(addChargeErr, "Validation")
        ) {
          showError(`Invalid charge data: ${addChargeErr}`);
        } else {
          showError(addChargeErr || "Failed to add charge");
        }
        break;

      case "charges/updateCharge/rejected":
        const updateChargeErr = getErrorMessage(action);
        if (safeIncludes(updateChargeErr, "not found")) {
          showError("Charge not found. Please refresh the page.");
        } else if (
          safeIncludes(updateChargeErr, "validation") ||
          safeIncludes(updateChargeErr, "Validation")
        ) {
          showError(`Invalid data: ${updateChargeErr}`);
        } else {
          showError(updateChargeErr || "Failed to update charge");
        }
        break;

      case "charges/deleteCharge/rejected":
        const deleteChargeErr = getErrorMessage(action);
        showError(deleteChargeErr || "Failed to delete charge");
        break;

      case "charges/bulkUpdate/rejected":
        const bulkUpdateErr = getErrorMessage(action);
        if (
          safeIncludes(bulkUpdateErr, "validation") ||
          safeIncludes(bulkUpdateErr, "Validation")
        ) {
          showError(`Invalid data: ${bulkUpdateErr}`);
        } else {
          showError(bulkUpdateErr || "Failed to update charges");
        }
        break;

      case "charges/bulkUpdateStatus/rejected":
        const bulkStatusErr = getErrorMessage(action);
        showError(bulkStatusErr || "Failed to update charge status");
        break;

      // ===== RECONCILE SLICE ERRORS =====

      case "reconcile/fetchUnreconciled/rejected":
        showError(
          "Failed to load unreconciled tasks. Please refresh and try again.",
        );
        break;

      case "reconcile/fetchNonBillable/rejected":
        showError(
          "Failed to load non-billable tasks. Please refresh and try again.",
        );
        break;

      case "reconcile/markNonBillable/rejected":
        const markNonBillableErr = getErrorMessage(action);
        if (
          safeIncludes(markNonBillableErr, "validation") ||
          safeIncludes(markNonBillableErr, "Validation")
        ) {
          showError(
            "Invalid request. Please check your selection and try again.",
          );
        } else {
          showError(
            markNonBillableErr || "Failed to mark tasks as non-billable",
          );
        }
        break;

      case "reconcile/restoreBillable/rejected":
        const restoreBillableErr = getErrorMessage(action);
        if (
          safeIncludes(restoreBillableErr, "validation") ||
          safeIncludes(restoreBillableErr, "Validation")
        ) {
          showError(
            "Invalid request. Please check your selection and try again.",
          );
        } else {
          showError(
            restoreBillableErr || "Failed to restore tasks to billable",
          );
        }
        break;

      case "reconcile/createAdHocCharge/rejected":
        const createAdHocErr = getErrorMessage(action);
        if (
          safeIncludes(createAdHocErr, "validation") ||
          safeIncludes(createAdHocErr, "Validation")
        ) {
          showError(`Invalid charge data: ${createAdHocErr}`);
        } else if (safeIncludes(createAdHocErr, "not found")) {
          showError("Entity not found. Please select a valid entity.");
        } else {
          showError(createAdHocErr || "Failed to create ad-hoc charge");
        }
        break;

      case "reconcile/deleteAdHocCharge/rejected":
        const deleteAdHocErr = getErrorMessage(action);
        if (safeIncludes(deleteAdHocErr, "not found")) {
          showError("Ad-hoc charge not found. Please refresh the page.");
        } else {
          showError(deleteAdHocErr || "Failed to delete ad-hoc charge");
        }
        break;

      // ===== INVOICE SLICE ERRORS =====

      case "invoice/fetchList/rejected":
        showError("Failed to load invoices. Please refresh and try again.");
        break;

      case "invoice/fetchReconciled/rejected":
        showError(
          "Failed to load reconciled invoices. Please refresh and try again.",
        );
        break;

      case "invoice/fetchDetails/rejected":
        const fetchInvoiceError = getErrorMessage(action);
        if (safeIncludes(fetchInvoiceError, "not found")) {
          showError("Invoice not found. Please check the invoice number.");
        } else {
          showError(fetchInvoiceError || "Failed to load invoice details");
        }
        break;

      case "invoice/createOrAppend/rejected":
        const createInvoiceError = getErrorMessage(action);
        if (
          safeIncludes(createInvoiceError, "validation") ||
          safeIncludes(createInvoiceError, "VALIDATION_ERROR")
        ) {
          showError("Invalid invoice data. Please check your input.");
        } else if (safeIncludes(createInvoiceError, "not found")) {
          showError(
            "Invoice not found. Please check the invoice number and try again.",
          );
        } else {
          showError(createInvoiceError || "Failed to create/update invoice");
        }
        break;

      case "invoice/updateInfo/rejected":
        const updateInvoiceError = getErrorMessage(action);
        if (safeIncludes(updateInvoiceError, "not found")) {
          showError("Invoice not found. Please refresh the page.");
        } else if (
          safeIncludes(updateInvoiceError, "validation") ||
          safeIncludes(updateInvoiceError, "VALIDATION_ERROR")
        ) {
          showError("Invalid data provided. Please check your input.");
        } else {
          showError(updateInvoiceError || "Failed to update invoice");
        }
        break;

      case "invoice/updateStatus/rejected":
        const statusUpdateError = getErrorMessage(action);
        if (safeIncludes(statusUpdateError, "not found")) {
          showError("Invoice not found. Please refresh the page.");
        } else if (safeIncludes(statusUpdateError, "Invalid status")) {
          showError("Invalid status. Please select a valid status.");
        } else {
          showError(statusUpdateError || "Failed to update invoice status");
        }
        break;

      case "invoice/bulkUpdateStatus/rejected":
        const bulkStatusError = getErrorMessage(action);
        if (
          safeIncludes(bulkStatusError, "validation") ||
          safeIncludes(bulkStatusError, "VALIDATION_ERROR")
        ) {
          showError(
            "Invalid request. Please check your selection and try again.",
          );
        } else {
          showError(bulkStatusError || "Failed to bulk update invoice status");
        }
        break;

      case "invoice/unlinkTasks/rejected":
        const unlinkError = getErrorMessage(action);
        if (safeIncludes(unlinkError, "not found")) {
          showError(
            "Invoice or tasks not found. Please refresh and try again.",
          );
        } else {
          showError(unlinkError || "Failed to remove tasks from invoice");
        }
        break;

      // Default error handler for all slices
      default:
        if (action.type.startsWith("services/")) {
          const errMsg =
            getArrayErrorMessage(action.payload) || getErrorMessage(action);
          showError(errMsg || "Booking operation failed");
        } else if (action.type.startsWith("customers/")) {
          const errMsg =
            getArrayErrorMessage(action.payload) || getErrorMessage(action);
          showError(errMsg || "Customer operation failed");
        } else if (action.type.startsWith("influencers/")) {
          const errMsg =
            getArrayErrorMessage(action.payload) || getErrorMessage(action);
          showError(errMsg || "Influencer operation failed");
        } else if (action.type.startsWith("commissions/")) {
          const errMsg =
            getArrayErrorMessage(action.payload) || getErrorMessage(action);
          showError(errMsg || "Commission operation failed");
        } else if (action.type.startsWith("users/")) {
          const errMsg =
            getArrayErrorMessage(action.payload) || getErrorMessage(action);
          showError(errMsg || "Operation failed");
        } else if (action.type.startsWith("entity/")) {
          const errMsg =
            getArrayErrorMessage(action.payload) || getErrorMessage(action);
          showError(errMsg || "Entity operation failed");
        } else if (action.type.startsWith("invoice/")) {
          const errMsg =
            getArrayErrorMessage(action.payload) || getErrorMessage(action);
          showError(errMsg || "Invoice operation failed");
        }
        break;
    }
  }

  // Pending messages (only for operations that benefit from loading indicators)
  if (action.type.endsWith("/pending")) {
    switch (action.type) {
      // ===== TASK SLICE PENDING =====

      case "task/createTask/pending":
        showInfo("Creating task...");
        break;

      case "task/deleteTask/pending":
        showInfo("Deleting task...");
        break;

      case "task/bulkUpdateTaskStatus/pending":
        showInfo("Updating task statuses...");
        break;

      case "task/bulkUpdateTaskPriority/pending":
        showInfo("Updating task priorities...");
        break;

      case "task/bulkAssignTasks/pending":
        showInfo("Assigning tasks...");
        break;

      // ===== TASK CATEGORY SLICE PENDING =====

      case "taskCategory/createCategory/pending":
        showInfo("Creating category...");
        break;

      case "taskCategory/updateCategory/pending":
        showInfo("Updating category...");
        break;

      case "taskCategory/deleteCategory/pending":
        showInfo("Deleting category...");
        break;

      // ===== USERS SLICE PENDING =====

      case "users/inviteUser/pending":
        showInfo("Sending invitation...");
        break;

      case "users/resendInvite/pending":
        showInfo("Resending invitation...");
        break;

      case "users/resetUserOnboarding/pending":
        showInfo("Sending Onboarding reset link...");
        break;

      case "users/sendPasswordResetLink/pending":
        showInfo("Sending Password reset link...");
        break;

      case "users/toggleUserStatus/pending":
        showInfo("Updating Account Status...");
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
        const customerFilterMeta = action.meta?.arg;
        if (customerFilterMeta?.mode === "export") {
          showInfo("Preparing customer export data...");
        }
        break;

      // ===== COMMISSIONS SLICE PENDING =====

      case "commissions/updateStatus/pending":
        showInfo("Updating commission status...");
        break;

      // ===== ENTITY SLICE PENDING =====

      case "entity/createEntity/pending":
        showInfo("Creating entity...");
        break;

      case "entity/updateEntity/pending":
        showInfo("Updating entity...");
        break;

      case "entity/deleteEntity/pending":
        showInfo("Deleting entity...");
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
        const filterMeta = action.meta?.arg;
        if (filterMeta?.mode === "export") {
          showInfo("Preparing export data...");
        }
        break;

      // ===== SERVICES SLICE PENDING =====

      case "services/filterBookings/pending":
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

      // ===== CHARGES SLICE PENDING =====

      case "charges/bulkUpdate/pending":
        showInfo("Saving changes...");
        break;

      case "charges/bulkUpdateStatus/pending":
        showInfo("Updating charge status...");
        break;

      // ===== RECONCILE SLICE PENDING =====

      case "reconcile/markNonBillable/pending":
        showInfo("Marking tasks as non-billable...");
        break;

      case "reconcile/restoreBillable/pending":
        showInfo("Restoring tasks to billable...");
        break;

      case "reconcile/createAdHocCharge/pending":
        showInfo("Creating ad-hoc charge...");
        break;

      case "reconcile/deleteAdHocCharge/pending":
        showInfo("Deleting ad-hoc charge...");
        break;

      // ===== INVOICE SLICE PENDING =====

      case "invoice/createOrAppend/pending":
        const createPendingArg = action.meta?.arg;
        if (createPendingArg?.invoice_internal_number) {
          showInfo("Adding tasks to invoice...");
        } else {
          showInfo("Creating invoice...");
        }
        break;

      case "invoice/updateInfo/pending":
        showInfo("Updating invoice...");
        break;

      case "invoice/updateStatus/pending":
        showInfo("Updating invoice status...");
        break;

      case "invoice/bulkUpdateStatus/pending":
        showInfo("Updating invoice statuses...");
        break;

      case "invoice/unlinkTasks/pending":
        showInfo("Removing tasks from invoice...");
        break;

      // Silent operations - no pending messages
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
      case "task/fetchTasks/pending":
      case "task/updateTask/pending":
      case "taskDetail/fetchTaskById/pending":
      case "taskDetail/addCharge/pending":
      case "taskDetail/updateCharge/pending":
      case "taskDetail/deleteCharge/pending":
      case "taskDetail/syncChecklist/pending":
      case "taskDetail/syncAssignments/pending":
      case "taskCategory/fetchCategories/pending":
      case "taskCategory/quickSearchCategories/pending":
      case "taskTimeline/fetchTimeline/pending":
      case "taskTimeline/loadMoreTimeline/pending":
      case "taskTimeline/createComment/pending":
      case "taskTimeline/updateComment/pending":
      case "taskTimeline/deleteComment/pending":
      case "entity/fetchEntities/pending":
      case "entity/quickSearchEntities/pending":
      case "entity/fetchEntityById/pending":
      case "charges/addToTask/pending":
      case "charges/updateCharge/pending":
      case "charges/deleteCharge/pending":
      case "reconcile/fetchUnreconciled/pending":
      case "reconcile/fetchNonBillable/pending":
      case "invoice/fetchList/pending":
      case "invoice/fetchReconciled/pending":
      case "invoice/fetchDetails/pending":
        // Silent operations
        break;

      default:
        break;
    }
  }

  return next(action);
};

export default toastMiddleware;
