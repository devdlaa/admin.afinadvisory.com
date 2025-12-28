import { tabs,TAB_IDS,STATUS } from "@/app/constants/bookings";
export const matchesTabFilter = (booking, tabId) => {
  const isNotAssigned =
    booking?.assignmentManagement?.members?.length <= 0 &&
    !booking?.assignmentManagement?.assignToAll &&
    !booking.progress_steps.isFulfilled;

  switch (tabId) {
    case TAB_IDS.PAYMENT_PENDING:
      return booking.master_status === STATUS.PAYMENT_PENDING;
    case TAB_IDS.NOT_ASSIGNED:
      return isNotAssigned;
    case TAB_IDS.PROCESSING:
      return booking.master_status === STATUS.PROCESSING;
    case TAB_IDS.COMPLETED:
      return booking.master_status === STATUS.COMPLETED;
    case TAB_IDS.REFUNDED:
      return booking.master_status === STATUS.REFUNDED;
    case TAB_IDS.REFUND_REQUESTED:
      return booking.isRefundFlagged === true;
    case TAB_IDS.ALL:
    default:
      return true;
  }
};

export const calculateTabCounts = (bookings) => {
  return tabs.reduce((counts, tab) => {
    counts[tab.id] = bookings.filter((b) => matchesTabFilter(b, tab.id)).length;
    return counts;
  }, {});
};

export const sortBookings = (bookings, sortConfig) => {
  if (!sortConfig.key) return bookings;

  return [...bookings].sort((a, b) => {
    let aValue, bValue;

    switch (sortConfig.key) {
      case "service_name":
        aValue = a.service_details?.service_name || "";
        bValue = b.service_details?.service_name || "";
        break;
      case "customer_name":
        aValue = `${a.user_details?.firstName || ""} ${
          a.user_details?.lastName || ""
        }`.trim();
        bValue = `${b.user_details?.firstName || ""} ${
          b.user_details?.lastName || ""
        }`.trim();
        break;
      case "plan_name":
        aValue = a.plan_details?.plan_name || "";
        bValue = b.plan_details?.plan_name || "";
        break;
      case "created_at":
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case "master_status":
        aValue = a.master_status || "";
        bValue = b.master_status || "";
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });
};