import { NextResponse } from "next/server";
import { auth } from "@/utils/auth";
import { z } from "zod";
import { requirePermission } from "@/lib/requirePermission";
import { assignMembers } from "@/utils/assignmentManager";

const memberSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  sendEmail: z.boolean().default(false),
});

const payloadSchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
  assignment: z.object({
    assignToAll: z.boolean().default(false),
    members: z.array(memberSchema).nullable().optional(),
  }),
});

export async function POST(req) {
  try {
    // Permission check
    const permissionCheck = await requirePermission(req, "tasks.assign_member");
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
    const currentUserName =
      session.user?.name || session.user?.email || "Unknown";

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
      taskId,
      assignment: { assignToAll, members },
    } = validation.data;

    // Use the shared utility
    const result = await assignMembers({
      collectionType: "tasks",
      documentId: taskId,
      assignToAll,
      members: members || [],
      currentUserId,
      currentUserName,
    });

    // Send emails if needed
    result.membersToEmail.forEach((member) => {
      console.log(`Send email to ${member.email} (${member.name})`);
    });

    return NextResponse.json({
      success: true,
      message: "Task assigned successfully",
      assignment: result.assignment,
    });
  } catch (err) {
    console.error("Assign Task Error:", err);
    const status = err.message.includes("not found") ? 404 : 400;
    return NextResponse.json(
      { success: false, message: err.message },
      { status }
    );
  }
}
