import {
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Repeat,
} from "lucide-react";

export const STATUS = {
  PROCESSING: "processing",
  PAYMENT_PENDING: "payment_pending",
  COMPLETED: "completed",
  REFUNDED: "refunded",
};

export const TAB_IDS = {
  ALL: "all",
  NOT_ASSIGNED: "not_assigned_yet",
  PAYMENT_PENDING: "payment_pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REFUND_REQUESTED: "refund_requested",
  REFUNDED: "refunded",
};

export const statusConfig = {
  [STATUS.PROCESSING]: {
    label: "Processing",
    icon: <Repeat />,
    color: "processing",
  },
  [STATUS.PAYMENT_PENDING]: {
    label: "Payment Pending",
    icon: <AlertCircle />,
    color: "payment_pending",
  },
  [STATUS.COMPLETED]: {
    label: "Completed",
    icon: <CheckCircle />,
    color: "completed",
  },
  [STATUS.REFUNDED]: {
    label: "Refunded",
    icon: <XCircle />,
    color: "refunded",
  },
};

export const tabs = [
  { id: TAB_IDS.ALL, label: "All Bookings" },
  {
    id: TAB_IDS.NOT_ASSIGNED,
    label: "Not Assigned",
    permissions: ["bookings.assign_member"],
  },
  { id: TAB_IDS.PAYMENT_PENDING, label: "Payment Pending" },
  { id: TAB_IDS.PROCESSING, label: "In Progress" },
  { id: TAB_IDS.COMPLETED, label: "Completed" },
  { id: TAB_IDS.REFUND_REQUESTED, label: "Refund Requested" },
  { id: TAB_IDS.REFUNDED, label: "Refunded" },
];

export const DEFAULT_ACTIONS = [
  { text: "Quick View", icon: Eye },
  { text: "Edit", icon: Edit3 },
];