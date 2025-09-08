// POST /api/admin/service/mark-fulfilled
import { NextResponse } from "next/server";
import { markServiceFulfilledByAdmin } from "@/utils/service_mutation_helpers";
import { z } from "zod";

const bodySchema = z.object({
  service_booking_ids: z.array(z.string()).min(1),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors },
        { status: 400 }
      );
    }

    const { service_booking_ids } = parsed.data;

    for (const id of service_booking_ids) {
      await markServiceFulfilledByAdmin(id);
    }

    return NextResponse.json({
      success: true,
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
