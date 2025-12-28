import { NextResponse } from "next/server";
import { auth } from "@/utils/server/auth";
import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";
import { assignMembers } from "@/utils/server/assignmentManager";

// client ONLY sends user_code for each member
const memberSchema = z.object({
  uid: z.string().min(1),
});

const payloadSchema = z.object({
  serviceId: z.string().min(1, "serviceId is required"),
  assignmentManagement: z.object({
    assignToAll: z.boolean().default(false),
    members: z.array(memberSchema).nullable().optional(),
  }),
});

export async function POST(req) {
  try {
    // 1) permission guard
    const permissionCheck = await requirePermission(
      req,
      "bookings.assign_member"
    );
    if (permissionCheck) return permissionCheck;

    // 2) session check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const currentUserName = session.user.name ?? "";

    // 3) validate payload shape only
    const body = await req.json();
    const validation = payloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      serviceId,
      assignmentManagement: { assignToAll, members },
    } = validation.data;

    // normalize
    const memberList = members || [];

    // 4) delegate everything to util
    const result = await assignMembers({
      collectionType: "service_bookings",
      documentId: serviceId,
      assignToAll,
      members: memberList,
      currentUserId,
      currentUserName,
    });

    return NextResponse.json({
      success: true,
      message: "Service booking assigned successfully",
      assignmentManagement: result.assignment,
    });
  } catch (err) {
    console.error("Assign Service Booking Error:", err);

    const status = err.message.includes("not found") ? 404 : 400;

    return NextResponse.json(
      { success: false, message: err.message },
      { status }
    );
  }
}
