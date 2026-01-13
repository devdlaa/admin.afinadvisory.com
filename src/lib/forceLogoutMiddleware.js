// forceLogoutMiddleware.js
import { signOut } from "next-auth/react";

export const forceLogoutMiddleware = (store) => (next) => (action) => {
  try {
    const payload = action?.payload;

    const forceLogout = payload?.details?.forceLogout === true;

    if (forceLogout) {
      console.warn("Force logout triggered by API response");

      // Optional: clear redux state
      store.dispatch({ type: "session/logout" });
      store.dispatch({ type: "user/clearUser" });

      // Sign out via NextAuth
      signOut({ callbackUrl: "/login" });

      return;
    }
  } catch (err) {
    console.error("forceLogoutMiddleware error:", err);
  }

  return next(action);
};
