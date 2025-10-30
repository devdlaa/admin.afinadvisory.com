"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { setSession, clearSession } from "@/store/slices/sessionSlice";

export default function SessionLoader() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      dispatch(
        setSession({
          user: session.user,
          permissions: session.user.permissions || [],
        })
      );
    } else if (status === "unauthenticated") {
      dispatch(clearSession());
    }
  }, [status, session, dispatch]);

  return null;
}
