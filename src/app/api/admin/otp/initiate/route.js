import { NextResponse } from "next/server";
import { initiateOtp } from "@/lib/otpService";

export async function POST(req) {
  try {
    const { userId, phoneNumber, actionId, metaData } = await req.json();

    if (!userId || !phoneNumber) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const data = await initiateOtp({ userId, phoneNumber, actionId, metaData });
    return NextResponse.json({ success: true, ...data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
