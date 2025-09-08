import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

// Payload validation schema
const assignTaskSchema = z.object({
  serviceId: z.string(),
  assignedMembers: z
    .array(
      z.object({
        userCode: z.string(),
        sendEmail: z.boolean(),
        name: z.string(),
        email: z.string().email()
      })
    )
    .optional(),
  assignToAll: z.boolean().optional()
});

export async function POST(req) {
  try {
    const body = await req.json();
    const validation = assignTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid payload", errors: validation.error.errors },
        { status: 400 }
      );
    }

    const { serviceId, assignedMembers = [], assignToAll } = validation.data;
    const currentUserId = "current_logged_in_user_id"; // Replace with real auth

    const firestore = admin.firestore();
    const serviceRef = firestore.collection("service_bookings").doc(serviceId);

    const updatedAssignmentManagement = await firestore.runTransaction(async (tx) => {
      const serviceSnap = await tx.get(serviceRef);

      if (!serviceSnap.exists) {
        throw new Error("Service not found");
      }

      const serviceData = serviceSnap.data();
      const assignment = serviceData.assignmentManagement || {
        assignToAll: false,
        members: []
      };

      // Toggle assignToAll if flag is provided
      if (typeof assignToAll === "boolean") {
        assignment.assignToAll = assignToAll;
      }

      // Always update members array
      const existingMembers = assignment.members || [];
      const now = new Date().toISOString();
      const membersMap = new Map();

      // Add existing members to map
      existingMembers.forEach((m) => membersMap.set(m.userCode, m));

      // Merge/Update members from payload
      assignedMembers.forEach((member) => {
        const existing = membersMap.get(member.userCode);
        if (existing) {
          // Update existing member
          membersMap.set(member.userCode, {
            ...existing,
            AssignedAt: now,
            AssignedBy: currentUserId,
            name: member.name,
            email: member.email,
            isEmailSentAlready: existing.isEmailSentAlready ? true : !member.sendEmail
          });
        } else {
          // Add new member
          membersMap.set(member.userCode, {
            userCode: member.userCode,
            AssignedAt: now,
            AssignedBy: currentUserId,
            name: member.name,
            email: member.email,
            isEmailSentAlready: !member.sendEmail
          });
        }
      });

      const mergedMembers = Array.from(membersMap.values());

      if (mergedMembers.length > 10) {
        throw new Error("Maximum of 10 members allowed");
      }

      assignment.members = mergedMembers;

      // Commit the transaction
      tx.update(serviceRef, { assignmentManagement: assignment });

      return assignment;
    });

    // Optional: Trigger emails
    updatedAssignmentManagement.members.forEach((member) => {
      if (!member.isEmailSentAlready && member.sendEmail) {
        console.log(`Send email to ${member.email} (${member.name})`);
        // Call your email sending function here
        // After sending, you would update isEmailSentAlready in Firestore if needed
      }
    });

    return NextResponse.json({
      success: true,
      message: "Task assigned successfully",
      assignmentManagement: updatedAssignmentManagement
    });

  } catch (error) {
    console.error("Assign Task Error:", error);
    const status = error.message === "Service not found" ? 404 : 400;
    return NextResponse.json({ success: false, message: error.message }, { status });
  }
}
