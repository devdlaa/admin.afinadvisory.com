// app/api/tasks/assignments/bulk/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkAssignUnownedTasks } from "@/services/taskAssignment.service";

// Zod validation schema for bulk assignment
const bulkAssignSchema = z.object({
  task_ids: z
    .array(z.string().uuid("Invalid task ID format"))
    .min(1, "At least one task ID is required"),
  user_ids: z
    .array(z.string().uuid("Invalid user ID format"))
    .min(1, "At least one user ID is required"),
});

// POST - Bulk assign unowned tasks
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = bulkAssignSchema.parse(body);

    // TODO: Get user ID from session/auth
    const updated_by = request.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000000";

    // Bulk assign
    const result = await bulkAssignUnownedTasks(
      validatedData.task_ids,
      validatedData.user_ids,
      updated_by
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Custom errors from service
    if (error.statusCode) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    // Generic server error
    console.error("Error bulk assigning tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}