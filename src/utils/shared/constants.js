// Status options
import {
  Clock,
  RefreshCcw,
  PauseCircle,
  Loader,
  CheckCircle2,
  XCircle,
  Flower,
  Waves,
  Flame,
} from "lucide-react";
export const statusOptions = [
  {
    value: "PENDING",
    label: "Pending",
    txtClr: "#b45309",
    bgColor: "#fffbeb",
    icon: <Clock size={16} color="#b45309" />,
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    txtClr: "#1d4ed8",
    bgColor: "#eff6ff",
    icon: <RefreshCcw size={16} color="#1d4ed8" />,
  },
  {
    value: "ON_HOLD",
    label: "On Hold",
    txtClr: "#6d28d9",
    bgColor: "#f5f3ff",
    icon: <PauseCircle size={16} color="#6d28d9" />,
  },
  {
    value: "PENDING_CLIENT_INPUT",
    label: "Pending Client Input",
    txtClr: "#c2410c",
    bgColor: "#fff7ed",
    icon: <Loader size={16} color="#c2410c" />,
  },
  {
    value: "COMPLETED",
    label: "Completed",
    txtClr: "#047857",
    bgColor: "#ecfdf5",
    icon: <CheckCircle2 size={16} color="#047857" />,
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    txtClr: "#b91c1c",
    bgColor: "#fef2f2",
    icon: <XCircle size={16} color="#b91c1c" />,
  },
];

export const priorityOptions = [
  {
    value: null,
    label: "All Priority",
    color: "#6b7280",
    txtClr: "#6b7280",
  },
  {
    value: "LOW",
    label: "Low Priority",
    txtClr: "#059669",
    bgColor: "#ecfdf5",
    icon: <Flower size={16} color="#059669" />,
  },
  {
    value: "NORMAL",
    label: "Normal Priority",
    txtClr: "#2563eb",
    bgColor: "#eff6ff",
    icon: <Waves size={16} color="#2563eb" />,
  },
  {
    value: "HIGH",
    label: "High Priority",
    txtClr: "#d97706",
    bgColor: "#fffbeb",
    icon: <Flame size={16} color="#d97706" />,
  },
];
