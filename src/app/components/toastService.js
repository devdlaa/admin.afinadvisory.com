import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

const reminderToastConfig = {
  ...toastConfig,
  autoClose: 10000,
  theme: "dark",
};

export const showSuccess = (message) => {
  toast.success(message, toastConfig);
};

export const showError = (message) => {
  toast.error(message, toastConfig);
};

export const showWarning = (message) => {
  toast.warn(message, toastConfig);
};

export const showInfo = (message) => {
  toast.info(message, toastConfig);
};
export const showReminderToast = (reminder) => {
  toast.info(
    <div>
      <div style={{ fontWeight: 600 }}>
        <strong>🔔 {reminder.title}</strong>
      </div>

      {reminder.bucket?.name && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {reminder.bucket.name} · Due now
        </div>
      )}

      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
        Click to view
      </div>
    </div>,
    reminderToastConfig,
  );
};
