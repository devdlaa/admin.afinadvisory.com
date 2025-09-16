import { NextResponse } from "next/server";
import { initiateOtp } from "@/lib/otpService";
import { auth } from "@/utils/auth";
import { requirePermission } from "@/lib/requirePermission";
export async function POST(req) {
  try {
    const session = await auth();
    const uid = session?.user?.uid;

    const { actionId, metaData } = await req.json();

    const data = await initiateOtp({ uid, actionId, metaData });
    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
