"use client";

import { useDispatch, useSelector } from "react-redux";
import {
  clearDetail,
  closeReminderDialog,
} from "@/store/slices/remindersSlice";

import styles from "./ReminderDetailsDialogWrapper.module.scss";
import ReminderDialog from "../Reminderdialog/Reminderdialog.jsx";

export default function ReminderDetailsDialogWrapper() {
  const dispatch = useDispatch();
  const { dialogOpen, mode, activeReminderId } = useSelector(
    (state) => state.reminders.ui,
  );

  if (!dialogOpen) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          dispatch(closeReminderDialog());
          dispatch(clearDetail());
        }
      }}
    >
      <ReminderDialog
        mode={mode}
        activeReminderId={activeReminderId}
        onClose={() => {
          dispatch(closeReminderDialog());
          dispatch(clearDetail());
        }}
      />
    </div>
  );
}
