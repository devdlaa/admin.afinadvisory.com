import { useNotificationSetup } from "@/hooks/useNotificationSetup";
import NotificationPanel from "./NotificationPanel";
import { useReminderSyncListener } from "@/hooks/useReminderSyncListener";

export default function NotificationProvider({ children }) {
  useNotificationSetup();
  useReminderSyncListener();

  return (
    <>
      {children}
      <NotificationPanel />
    </>
  );
}
