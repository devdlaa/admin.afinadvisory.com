"use client";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { ToastContainer } from "react-toastify";
import SessionLoader from "./SessionLoader";

import NotificationProvider from "./shared/Notifications/NotificationProvider";

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <ToastContainer />
      <SessionLoader />
      <NotificationProvider>{children}</NotificationProvider>
    </Provider>
  );
}
