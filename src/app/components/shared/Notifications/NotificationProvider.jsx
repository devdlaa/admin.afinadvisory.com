import { useNotificationSetup } from "@/hooks/useNotificationSetup";
import NotificationPanel from "./NotificationPanel";

export default function NotificationProvider({ children }) {
  // Setup push notifications and listeners
  useNotificationSetup();

  return (
    <>
      {children}
      <NotificationPanel />
    </>
  );
}
