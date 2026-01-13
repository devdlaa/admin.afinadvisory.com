import { NextResponse } from "next/server";

import { markServiceFulfilledByAdmin } from "@/utils/server/service_mutation_helpers";
import { requirePermission } from "@/utils/server/requirePermission";
import { z } from "zod";

const bodySchema = z.object({
  service_booking_ids: z.array(z.string()).min(1),
});

export async function POST(req) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "bookings.access"
    );
    if (permissionError) return permissionError;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors },
        { status: 400 }
      );
    }

    const { service_booking_ids } = parsed.data;

    const updated_services = await markServiceFulfilledByAdmin(
      service_booking_ids,
      session
    );

    return NextResponse.json({
      success: true,
      updated_services,
      message: `Marked ${service_booking_ids.length} services fulfilled.`,
    });
  } catch (error) {
    console.error("Mark Fulfilled API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
