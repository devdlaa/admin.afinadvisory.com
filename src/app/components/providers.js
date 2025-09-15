"use client";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { ToastContainer } from "react-toastify";
import SessionLoader from "./SessionLoader";

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <ToastContainer />
      <SessionLoader /> 
      {children}
    </Provider>
  );
}
