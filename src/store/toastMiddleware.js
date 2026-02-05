import {
  showSuccess,
  showError,
  showInfo,
} from "@/app/components/toastService";

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
        const chargesStatusPayload = action.payload;
        showSuccess("Charge status updated successfully");
        break;

      case "reconcile/fetchUnreconciled/fulfilled":
      case "reconcile/fetchNonBillable/fulfilled":
        // Silent operations - no toast
        break;

      // Fetch Invoices - No toast (silent background operation)
      case "invoice/fetchList/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Fetch Reconciled Invoices - No toast (silent background operation)
      case "invoice/fetchReconciled/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Fetch Invoice Details - No toast (silent background operation)
      case "invoice/fetchDetails/fulfilled":
        // No toast - fetching is expected to be silent
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
            } assigned)`,
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
            "User created but invitation email could not be sent. Please resend manually.",
          );
        } else {
          showSuccess("User invitation processed successfully");
        }
        break;

      // Resend Invitation
      case "users/resendInvite/fulfilled":
        showSuccess("Invitation resent successfully");
        break;

      // Reset User Onboarding
      case "users/resetUserOnboarding/fulfilled":
        const resetPayload = action.payload;
        if (resetPayload?.data?.emailSent) {
          showSuccess("Onboarding reset link sent successfully");
        } else {
          showInfo("Onboarding reset processed but email could not be sent");
        }
        break;

      // Reset User Onboarding
      case "users/sendPasswordResetLink/fulfilled":
        const resetPassowrdLinkPayload = action.payload;
        if (resetPassowrdLinkPayload?.success) {
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
            } ready for download`,
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
            `${newUserName} added successfully! Password reset link generated.`,
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
            } marked as ${newStatus}. ${skippedCount} already had this status.`,
          );
        } else if (updatedCount > 0) {
          // All updated successfully
          showSuccess(
            `${updatedCount} commission${
              updatedCount !== 1 ? "s" : ""
            } marked as ${newStatus} successfully`,
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
            } ready for download`,
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
            } ready for download`,
          );
        }
        // No toast for regular filtering - it's expected to be silent
        break;

      // Fetch Entities - No toast (silent background operation)
      case "entity/fetchEntities/fulfilled":
        // No toast - fetching is expected to be silent
        break;

      // Quick Search Entities - No toast (silent background operation)
      case "entity/quickSearchEntities/fulfilled":
        // No toast - search is expected to be silent
        break;

      // Fetch Entity By ID - No toast (silent background operation)
      case "entity/fetchEntityById/fulfilled":
        // No toast - fetching single entity is expected to be silent
        break;

      // Create Entity
      case "entity/createEntity/fulfilled":
        const newEntity = action.payload;
        const entityName = newEntity?.name || "Entity";
        showSuccess(`${entityName} created successfully`);
        break;

      // Update Entity
      case "entity/updateEntity/fulfilled":
        const updatedEntity = action.payload;
        const updatedEntityName = updatedEntity?.name || "Entity";
        showSuccess(`${updatedEntityName} updated successfully`);
        break;

      // Delete Entity
      case "entity/deleteEntity/fulfilled":
        showSuccess("Entity deleted successfully");
        break;
    }
  }

  // Error messages
  if (action.type.endsWith("/rejected")) {
    switch (action.type) {
      case "task/fetchAssignmentReport/rejected":
        const assignmentReportError =
          action.payload?.message || action.error?.message;
        if (assignmentReportError?.includes("unauthorized")) {
          showError("You don't have permission to view workload data");
        } else if (assignmentReportError?.includes("no data")) {
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
        const createTaskError =
          action.payload?.message || action.error?.message;
        if (createTaskError?.includes("validation")) {
          showError("Invalid task data. Please check your input.");
        } else {
          showError(createTaskError || "Failed to create task");
        }
        break;

      case "task/updateTask/rejected":
        const updateTaskError =
          action.payload?.message || action.error?.message;
        if (updateTaskError?.includes("not found")) {
          showError("Task not found. Please refresh the page.");
        } else {
          showError(updateTaskError || "Failed to update task");
        }
        break;

      case "task/deleteTask/rejected":
        const deleteTaskError =
          action.payload?.message || action.error?.message;
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
        const fetchTaskError = action.payload?.message || action.error?.message;
        if (fetchTaskError?.includes("not found")) {
          showError("Task not found. Please refresh the page.");
        } else {
          showError("Failed to load task details. Please try again.");
        }
        break;

      case "taskDetail/addCharge/rejected":
        const addChargeError = action.payload?.message || action.error?.message;
        if (addChargeError?.includes("validation")) {
          showError("Invalid charge data. Please check your input.");
        } else {
          showError(addChargeError || "Failed to add charge");
        }
        break;

      case "taskDetail/updateCharge/rejected":
        const updateChargeError =
          action.payload?.message || action.error?.message;
        showError(updateChargeError || "Failed to add charge");
        break;

      case "taskDetail/deleteCharge/rejected":
        showError("Failed to delete charge. Please try again.");
        break;

      case "taskDetail/syncChecklist/rejected":
        showError("Failed to save checklist. Please try again.");
        break;

      case "taskDetail/syncAssignments/rejected":
        const syncAssignmentsError =
          action.payload?.message || action.error?.message;
        if (syncAssignmentsError?.includes("not found")) {
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
        const createCategoryError =
          action.payload?.message || action.error?.message;
        if (
          createCategoryError?.includes("already exists") ||
          createCategoryError?.includes("duplicate")
        ) {
          showError("Category with this name already exists");
        } else if (createCategoryError?.includes("validation")) {
          showError("Invalid category data. Please check your input.");
        } else {
          showError(createCategoryError || "Failed to create category");
        }
        break;

      case "taskCategory/updateCategory/rejected":
        const updateCategoryError =
          action.payload?.message || action.error?.message;
        if (updateCategoryError?.includes("not found")) {
          showError("Category not found. Please refresh the page.");
        } else {
          showError(updateCategoryError || "Failed to update category");
        }
        break;

      case "taskCategory/deleteCategory/rejected":
        const deleteCategoryError =
          action.payload?.message || action.error?.message;
        if (
          deleteCategoryError?.includes("in use") ||
          deleteCategoryError?.includes("associated")
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
        const createCommentError =
          action.payload?.message || action.error?.message;
        if (createCommentError?.includes("validation")) {
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
                "Failed to invite user",
            );
          }
        } else {
          showError(
            inviteError?.message ||
              action.error?.message ||
              "Failed to invite user",
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
              "Failed to resend invitation",
          );
        }
        break;

      case "users/resetUserOnboarding/rejected":
        const resetError = action.payload;
        if (Array.isArray(resetError) && resetError[0]?.message) {
          showError(resetError[0].message);
        } else {
          showError(
            resetError?.message ||
              action.error?.message ||
              "Failed to send Onboarding reset link",
          );
        }
        break;

      case "users/sendPasswordResetLink/rejected":
        const sendPasswordResetLinkErr = action.payload;
        if (
          Array.isArray(sendPasswordResetLinkErr) &&
          sendPasswordResetLinkErr[0]?.message
        ) {
          showError(sendPasswordResetLinkErr[0].message);
        } else {
          showError(
            sendPasswordResetLinkErr?.message ||
              action.error?.message ||
              "Failed to send Password reset link",
          );
        }
        break;

      case "users/toggleUserStatus/rejected":
        const toggleStatusError = action.payload;
        if (Array.isArray(toggleStatusError) && toggleStatusError[0]?.message) {
          showError(toggleStatusError[0].message);
        } else {
          showError(
            toggleStatusError?.message ||
              action.error?.message ||
              "Failed to Update Account Status",
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
            "Invalid search format. Please check your input and try again.",
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
        const updateCustomerError = action.payload?.message?.details?.errors;

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
        const searchError = action.error?.message || action.payload?.message;
        if (searchError?.includes("Unsupported search format")) {
          showError(
            "Invalid search format. Please check your input and try again.",
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
            "Some commissions were not found. Please refresh and try again.",
          );
        } else if (statusError?.includes("validation")) {
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
        const influencerSearchError =
          action.error?.message || action.payload?.message;
        if (influencerSearchError?.includes("Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again.",
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
            "Network error. Please check your connection and try again.",
          );
        } else {
          showError(
            addInfluencerError?.message ||
              action.error?.message ||
              "Failed to add new influencer",
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
            "Update failed: Data already exists for another influencer",
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
            "Invalid search format. Please check your input and try again.",
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
      case "entity/fetchEntities/rejected":
        showError("Failed to load entities. Please refresh and try again.");
        break;

      case "entity/quickSearchEntities/rejected":
        const quickSearchError =
          action.error?.message || action.payload?.message;
        if (quickSearchError?.includes("Invalid search")) {
          showError(
            "Invalid search format. Please check your input and try again.",
          );
        } else {
          showError("Entity search failed. Please try again.");
        }
        break;

      case "entity/fetchEntityById/rejected":
        const fetchByIdError = action.error?.message || action.payload?.message;
        if (fetchByIdError?.includes("not found")) {
          showError("Entity not found. Please refresh the page.");
        } else {
          showError(fetchByIdError || "Failed to fetch entity");
        }
        break;

      case "entity/createEntity/rejected":
        const createError = action.payload;
        if (
          createError?.code === "DUPLICATE_ENTRY" ||
          createError?.message?.includes("already exists")
        ) {
          showError(`Entity creation failed: ${createError.message}`);
        } else if (createError?.code === "VALIDATION_ERROR") {
          showError(`Invalid data: ${createError.message}`);
        } else {
          showError(
            createError?.message ||
              action.error?.message ||
              "Failed to create entity",
          );
        }
        break;

      case "entity/updateEntity/rejected":
        const updateEntityError = action.payload;
        if (updateEntityError?.message?.includes("not found")) {
          showError("Entity not found. Please refresh the page.");
        } else if (
          updateEntityError?.message?.includes("duplicate") ||
          updateEntityError?.message?.includes("already exists")
        ) {
          showError("Update failed: Data already exists for another entity");
        } else if (updateEntityError?.code === "VALIDATION_ERROR") {
          showError("Invalid data provided. Please check your input.");
        } else {
          showError(
            updateEntityError?.message ||
              action.error?.message ||
              "Failed to update entity",
          );
        }
        break;

      case "entity/deleteEntity/rejected":
        const deleteEntityError = action.payload;
        if (deleteEntityError?.message?.includes("not found")) {
          showError("Entity not found. Please refresh the page.");
        } else if (
          deleteEntityError?.message?.includes("associated") ||
          deleteEntityError?.message?.includes("dependent")
        ) {
          showError(
            "Cannot delete entity: Has associated data or dependencies",
          );
        } else {
          showError(
            deleteEntityError?.message ||
              action.error?.message ||
              "Failed to delete entity",
          );
        }
        break;

      case "charges/addToTask/rejected":
        const addChargeErr = action.payload?.message || action.error?.message;
        if (
          addChargeErr?.includes("validation") ||
          addChargeErr?.includes("Validation")
        ) {
          showError(`Invalid charge data: ${addChargeErr}`);
        } else {
          showError(addChargeErr || "Failed to add charge");
        }
        break;

      case "charges/updateCharge/rejected":
        const updateChargeErr =
          action.payload?.message || action.error?.message;
        if (updateChargeErr?.includes("not found")) {
          showError("Charge not found. Please refresh the page.");
        } else if (
          updateChargeErr?.includes("validation") ||
          updateChargeErr?.includes("Validation")
        ) {
          showError(`Invalid data: ${updateChargeErr}`);
        } else {
          showError(updateChargeErr || "Failed to update charge");
        }
        break;

      case "charges/deleteCharge/rejected":
        const deleteChargeErr =
          action.payload?.message || action.error?.message;
        showError(deleteChargeErr || "Failed to delete charge");
        break;

      case "charges/bulkUpdate/rejected":
        const bulkUpdateErr = action.payload?.message || action.error?.message;
        if (
          bulkUpdateErr?.includes("validation") ||
          bulkUpdateErr?.includes("Validation")
        ) {
          showError(`Invalid data: ${bulkUpdateErr}`);
        } else {
          showError(bulkUpdateErr || "Failed to update charges");
        }
        break;

      case "charges/bulkUpdateStatus/rejected":
        const bulkStatusErr = action.payload?.message || action.error?.message;
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
        const markNonBillableErrRaw = action.payload || action.error?.message;

        const markNonBillableErr =
          typeof markNonBillableErrRaw === "string"
            ? markNonBillableErrRaw
            : markNonBillableErrRaw?.message ||
              JSON.stringify(markNonBillableErrRaw || "");

        if (
          markNonBillableErr.includes("validation") ||
          markNonBillableErr.includes("Validation")
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
        const restoreBillableErr = action.payload || action.error?.message;
        if (
          restoreBillableErr?.includes("validation") ||
          restoreBillableErr?.includes("Validation")
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
        const createAdHocErr = action.payload || action.error?.message;
    
        if (
          createAdHocErr?.includes("validation") ||
          createAdHocErr?.includes("Validation")
        ) {
          showError(`Invalid charge data: ${createAdHocErr}`);
        } else if (createAdHocErr?.includes("not found")) {
          showError("Entity not found. Please select a valid entity.");
        } else {
          showError(createAdHocErr || "Failed to create ad-hoc charge");
        }
        break;

      case "reconcile/deleteAdHocCharge/rejected":
        const deleteAdHocErr = action.payload || action.error?.message;
        if (deleteAdHocErr?.includes("not found")) {
          showError("Ad-hoc charge not found. Please refresh the page.");
        } else {
          showError(deleteAdHocErr || "Failed to delete ad-hoc charge");
        }
        break;

      case "invoice/fetchList/rejected":
        showError("Failed to load invoices. Please refresh and try again.");
        break;

      case "invoice/fetchReconciled/rejected":
        showError(
          "Failed to load reconciled invoices. Please refresh and try again.",
        );
        break;

      case "invoice/fetchDetails/rejected":
        const fetchInvoiceError =
          action.payload?.message || action.error?.message;
        if (fetchInvoiceError?.includes("not found")) {
          showError("Invoice not found. Please check the invoice number.");
        } else {
          showError(fetchInvoiceError || "Failed to load invoice details");
        }
        break;

      case "invoice/createOrAppend/rejected":
        const createInvoiceError =
          action.payload?.message || action.error?.message;
        if (
          createInvoiceError?.includes("validation") ||
          createInvoiceError?.includes("VALIDATION_ERROR")
        ) {
          showError("Invalid invoice data. Please check your input.");
        } else if (createInvoiceError?.includes("not found")) {
          showError(
            "Invoice not found. Please check the invoice number and try again.",
          );
        } else {
          showError(createInvoiceError || "Failed to create/update invoice");
        }
        break;

      case "invoice/updateInfo/rejected":
        const updateInvoiceError =
          action.payload?.message || action.error?.message;
        if (updateInvoiceError?.includes("not found")) {
          showError("Invoice not found. Please refresh the page.");
        } else if (
          updateInvoiceError?.includes("validation") ||
          updateInvoiceError?.includes("VALIDATION_ERROR")
        ) {
          showError("Invalid data provided. Please check your input.");
        } else {
          showError(updateInvoiceError || "Failed to update invoice");
        }
        break;

      case "invoice/updateStatus/rejected":
        const statusUpdateError =
          action.payload?.message || action.error?.message;
        if (statusUpdateError?.includes("not found")) {
          showError("Invoice not found. Please refresh the page.");
        } else if (statusUpdateError?.includes("Invalid status")) {
          showError("Invalid status. Please select a valid status.");
        } else {
          showError(statusUpdateError || "Failed to update invoice status");
        }
        break;

      case "invoice/bulkUpdateStatus/rejected":
        const bulkStatusError =
          action.payload?.message || action.error?.message;
        if (
          bulkStatusError?.includes("validation") ||
          bulkStatusError?.includes("VALIDATION_ERROR")
        ) {
          showError(
            "Invalid request. Please check your selection and try again.",
          );
        } else {
          showError(bulkStatusError || "Failed to bulk update invoice status");
        }
        break;

      case "invoice/unlinkTasks/rejected":
        const unlinkError = action.payload?.message || action.error?.message;
        if (unlinkError?.includes("not found")) {
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
        } else if (action.type.startsWith("entity/")) {
          const errMsg =
            action.error?.message ||
            action.payload?.message ||
            (Array.isArray(action.payload)
              ? action.payload[0]?.message
              : null) ||
            "Entity operation failed";
          showError(errMsg);
        }
        // ADD THIS NEW BLOCK HERE ⬇️
        else if (action.type.startsWith("invoice/")) {
          const errMsg =
            action.error?.message ||
            action.payload?.message ||
            (Array.isArray(action.payload)
              ? action.payload[0]?.message
              : null) ||
            "Invoice operation failed";
          showError(errMsg);
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

      // Show loading for operations that take longer time
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

      case "entity/createEntity/pending":
        showInfo("Creating entity...");
        break;

      case "entity/updateEntity/pending":
        showInfo("Updating entity...");
        break;

      case "entity/deleteEntity/pending":
        showInfo("Deleting entity...");
        break;

      // No pending messages for these operations (they should be fast/silent)
      case "entity/fetchEntities/pending":
      case "entity/quickSearchEntities/pending":
      case "entity/fetchEntityById/pending":
        // No toast - these operations should be silent while pending
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

      case "charges/addToTask/pending":
        // Silent - loading handled by UI component
        break;

      case "charges/updateCharge/pending":
        // Silent - loading handled by UI component
        break;

      case "charges/deleteCharge/pending":
        // Silent - loading handled by UI component
        break;

      case "charges/bulkUpdate/pending":
        showInfo("Saving changes...");
        break;

      case "charges/bulkUpdateStatus/pending":
        showInfo("Updating charge status...");
        break;

      // ===== RECONCILE SLICE PENDING =====

      case "reconcile/fetchUnreconciled/pending":
      case "reconcile/fetchNonBillable/pending":
        // Silent - loading handled by pagination UI
        break;

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

      case "invoice/fetchList/pending":
      case "invoice/fetchReconciled/pending":
      case "invoice/fetchDetails/pending":
        // Silent - loading handled by UI components
        break;

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
        // Silent operations
        break;

      default:
        break;
    }
  }

  return next(action);
};

export default toastMiddleware;
