import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { showReminderToast } from "@/app/components/toastService";

import {
  syncAcknowledgeFromExtension,
  syncSnoozeFromExtension,
} from "@/store/slices/remindersSlice";
import { incrementReminderAttention } from "@/store/slices/remindersOverviewSlice";

export function useReminderSyncListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    function handler(event) {
      if (event.origin !== window.location.origin) return;

      const { type, action, payload, reminder } = event.data || {};

      if (type === "REMINDER_SYNC_FROM_EXTENSION") {
      

        switch (action) {
          case "ACKNOWLEDGE":
            dispatch(syncAcknowledgeFromExtension(payload));
            break;

          case "SNOOZE":
            dispatch(syncSnoozeFromExtension(payload));
            break;

          default:
            break;
        }
      }

      if (type === "REMINDER_FIRED") {
        showReminderToast(reminder);
        dispatch(incrementReminderAttention());
      }
    }

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [dispatch]);
}
