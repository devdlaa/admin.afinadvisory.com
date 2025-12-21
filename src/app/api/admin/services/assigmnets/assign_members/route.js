import { NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { z } from "zod";
import { requirePermission } from "@/lib/requirePermission";
import { assignMembers } from "@/utils/assignmentManager";

const memberSchema = z.object({
  userCode: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  sendEmail: z.boolean().default(false),
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
    // Permission check
    const permissionCheck = await requirePermission(
      req,
      "bookings.assign_member"
    );
    if (permissionCheck) return permissionCheck;

    // Session check
    const session = await auth();
    if (!session || !(session.user?.id || session.user?.uid)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: no valid session" },
        { status: 401 }
      );
    }
    const currentUserId = session.user?.id ?? session.user?.uid;

    // Validate payload
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

    // Use the shared utility
    const result = await assignMembers({
      collectionType: "service_bookings",
      documentId: serviceId,
      assignToAll,
      members: members || [],
      currentUserId,
    });

    // Send emails if needed
    result.membersToEmail.forEach((member) => {
      console.log(`Send email to ${member.email} (${member.name})`);
      // TODO: Implement actual email sending logic
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
