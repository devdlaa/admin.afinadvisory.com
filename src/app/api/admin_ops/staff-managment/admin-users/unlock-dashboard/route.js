import { NextResponse } from "next/server";
import { verifyTotpForUnlock } from "@/utils/server/auth";
import { requirePermission } from "@/utils/server/requirePermission";
export async function POST(req) {
  const [permissionError, session] = await requirePermission(req);
  if (permissionError) return permissionError;
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const isValid = await verifyTotpForUnlock(session.user.id, code);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid TOTP code" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "TOTP verification successful",
  });
}
