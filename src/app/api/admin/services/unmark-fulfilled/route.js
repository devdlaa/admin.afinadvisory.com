import { NextResponse } from "next/server";
import { unmarkServiceFulfilledByAdmin } from "@/utils/service_mutation_helpers";
import { requirePermission } from "@/lib/requirePermission";
import { auth } from "@/utils/auth";
import { z } from "zod";

const bodySchema = z.object({
  service_booking_ids: z.array(z.string()).min(1),
});

export async function POST(req) {
  try {
    const permissionCheck = await requirePermission(req, ["bookings.unmark_fulfilled",
    ]);
    if (permissionCheck) return permissionCheck;

    const body = await req.json();
        const session = await auth();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors },
        { status: 400 }
      );
    }

    const { service_booking_ids } = parsed.data;

    const updated_services = [];
    for (const id of service_booking_ids) {
      try {
        const result = await unmarkServiceFulfilledByAdmin(id,session);
        updated_services.push(result);
      } catch (err) {
        updated_services.push({
          service_booking_id: id,
          success: false,
          reason: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated_services,
      message: `Unmarked ${service_booking_ids.length} services as fulfilled.`,
    });
  } catch (error) {
    console.error("Unmark Fulfilled API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
