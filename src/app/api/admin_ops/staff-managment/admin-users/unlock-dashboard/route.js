import { NextResponse } from "next/server";
import { auth, verifyTotpForUnlock } from "@/utils/server/auth";

export async function POST(req) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  // ✅ Verify TOTP code
  const isValid = await verifyTotpForUnlock(session.user.id, code);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid TOTP code" }, { status: 400 });
  }

  // ✅ Return success - client will handle session update
  return NextResponse.json({ 
    success: true,
    message: "TOTP verification successful" 
  });
}