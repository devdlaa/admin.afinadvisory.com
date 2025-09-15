// /api/admin/service/refund-reject
import { NextResponse } from "next/server";
import { markRefundRejected } from "@/utils/service_mutation_helpers";
import { z } from "zod";

const bodySchema = z.object({
  service_booking_id: z.string(),
  adminNote: z.string().min(3, "Admin note is required"),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

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

    const result = await markRefundRejected(service_booking_id, adminNote);

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
