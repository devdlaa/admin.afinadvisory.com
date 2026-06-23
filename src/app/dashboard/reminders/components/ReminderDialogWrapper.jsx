"use client";

import { useDispatch, useSelector } from "react-redux";
import ReminderDialog from "./Reminderdialog/Reminderdialog";

import {
  createReminder,
  selectCreating,
  selectCreateError,
  selectConflict,
  clearConflict,
  clearCreateError,
} from "@/store/slices/remindersSlice";

export default function ReminderDialogWrapper({ open, onClose }) {
  const dispatch = useDispatch();

  const creating = useSelector(selectCreating);
  const createError = useSelector(selectCreateError);
  const conflict = useSelector(selectConflict);

  const handleClose = () => {
    dispatch(clearCreateError());
    dispatch(clearConflict());
    onClose();
  };

  const handleCreate = async (payload) => {
    try {
      const res = await dispatch(createReminder(payload)).unwrap();

      // If conflict (409), do NOT close dialog
      if (res?.status === 409 || res?.data?.conflict?.exists) {
        return;
      }

      // success → close dialog
      handleClose();
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  if (!open) return null;

  return (
    <>
      <ReminderDialog
        mode="create"
        loading={creating}
        onCreate={handleCreate}
        onClose={handleClose}
      />

      {/* Optional: debug / temporary UI */}
      {createError && (
        <div style={{ position: "fixed", bottom: 20, right: 20, color: "red" }}>
          {createError}
        </div>
      )}

      {conflict?.exists && (
        <div style={{ position: "fixed", bottom: 60, right: 20 }}>
          ⚠️ Conflict detected with another reminder
        </div>
      )}
    </>
  );
}
