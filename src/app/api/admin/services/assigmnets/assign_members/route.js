import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import { z } from "zod";
import { requirePermission } from "@/lib/requirePermission";

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
    // Permission check placeholder
    const permissionCheck = await requirePermission(
      req,
      "bookings.assign_member"
    );
    if (permissionCheck) return permissionCheck;
    const session = await auth();
    if (!session || !(session.user?.id || session.user?.uid)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: no valid session" },
        { status: 401 }
      );
    }
    const currentUserId = session.user?.id ?? session.user?.uid;

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

    // ✅ If null/undefined → empty array
    const normalizedMembers = Array.isArray(members) ? members : [];

    const firestore = admin.firestore();
    const serviceRef = firestore.collection("service_bookings").doc(serviceId);

    const updatedAssignmentManagement = await firestore.runTransaction(
      async (tx) => {
        const serviceSnap = await tx.get(serviceRef);
        if (!serviceSnap.exists) throw new Error("Service not found");

        const now = new Date().toISOString();
        const assignment = {
          assignToAll,
          members: normalizedMembers.map((m) => ({
            userCode: m.userCode,
            name: m.name,
            email: m.email,
            AssignedAt: now,
            AssignedBy: currentUserId,
            isEmailSentAlready: !m.sendEmail,
          })),
        };

        if (assignment.members.length > 10) {
          throw new Error("Maximum of 10 members allowed");
        }

        // ✅ Build flattened keys for fast querying (used by dashboard API)
        const assignedKeys = assignToAll
          ? [] // if everyone can view, no need to list specific users
          : normalizedMembers.flatMap((m) => [
              `email:${m.email}`,
              `userCode:${m.userCode}`,
            ]);

        // ✅ Update both assignmentManagement and assignedKeys atomically
        tx.update(serviceRef, {
          assignmentManagement: assignment,
          assignedKeys, // <-- new field
        });

        return assignment;
      }
    );

    // Send emails if needed (unchanged)
    updatedAssignmentManagement.members.forEach((m, i) => {
      const original = normalizedMembers[i];
      if (original && original.sendEmail && !m.isEmailSentAlready) {
        console.log(`Send email to ${m.email} (${m.name})`);
      }
    });

    return NextResponse.json({
      success: true,
      message: "Task assigned successfully",
      assignmentManagement: updatedAssignmentManagement,
    });
  } catch (err) {
    console.error("Assign Task Error:", err);
    const status = err.message === "Service not found" ? 404 : 400;
    return NextResponse.json(
      { success: false, message: err.message },
      { status }
    );
  }
}
