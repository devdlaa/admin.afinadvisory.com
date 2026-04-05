import { useNotificationSetup } from "@/hooks/useNotificationSetup";
import NotificationPanel from "./NotificationPanel";

export default function NotificationProvider({ children }) {

  useNotificationSetup();

  return (
    <>
      {children}
      <NotificationPanel />
    </>
  );
}
