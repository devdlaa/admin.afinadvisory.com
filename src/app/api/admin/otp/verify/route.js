import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otpService";

export async function POST(req) {
  try {
    const { otpId, otp } = await req.json();

    if (!otpId || !otp) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const data = await verifyOtp({ otpId, otp });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
