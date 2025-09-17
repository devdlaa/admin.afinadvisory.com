import { NextResponse } from "next/server";
import { markRefundRejected } from "@/utils/service_mutation_helpers";
import { requirePermission } from "@/lib/requirePermission";
import { z } from "zod";
import { auth } from "@/utils/auth";
const bodySchema = z.object({
  service_booking_id: z.string(),
  adminNote: z.string().min(3, "Admin note is required"),
});

export async function POST(req) {
  try {
    // Permission check placeholder
    const permissionCheck = await requirePermission(
      req,
      "bookings.reject_refund"
    );
    if (permissionCheck) return permissionCheck;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    const session = await auth();

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { service_booking_id, adminNote } = parsed.data;

    const result = await markRefundRejected(service_booking_id, adminNote,session);

    if (!result || result.success === false) {
      return NextResponse.json(
        {
          success: false,
          error: result?.reason || "Refund rejection failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Refund rejected for service ${service_booking_id}`,
      updatedService: result,
    });
  } catch (error) {
    console.error("Refund Reject API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
