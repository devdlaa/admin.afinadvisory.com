import { useEffect } from "react";
import { useDispatch } from "react-redux";

import {
  syncAcknowledgeFromExtension,
  syncSnoozeFromExtension,
} from "@/store/slices/remindersSlice";

export function useReminderSyncListener() {
  const dispatch = useDispatch();
  console.log("REVERSE SYNC ACTIVE");

  useEffect(() => {
    function handler(event) {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type !== "REMINDER_SYNC_FROM_EXTENSION") return;

      const { action, payload } = event.data;

      console.log("[Sync] Extension → App:", action, payload);

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

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [dispatch]);
}
