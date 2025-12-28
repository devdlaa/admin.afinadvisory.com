// app/api/tasks/bulk/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  bulkUpdateTaskStatus,
  bulkUpdateTaskPriority,
} from "@/services/task.service";

// Zod validation schema for bulk status update
const bulkStatusSchema = z.object({
  task_ids: z
    .array(z.string().uuid("Invalid task ID format"))
    .min(1, "At least one task ID is required"),
  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "ON_HOLD",
    "PENDING_CLIENT_INPUT",
  ]),
});

// Zod validation schema for bulk priority update
const bulkPrioritySchema = z.object({
  task_ids: z
    .array(z.string().uuid("Invalid task ID format"))
    .min(1, "At least one task ID is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH",]),
});

// POST - Bulk update tasks
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const body = await request.json();

    // TODO: Get user ID from session/auth
    const updated_by =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    let result;

    if (action === "status") {
      // Validate for status update
      const validatedData = bulkStatusSchema.parse(body);

      // Bulk update status
      result = await bulkUpdateTaskStatus(
        validatedData.task_ids,
        validatedData.status,
        updated_by
      );
    } else if (action === "priority") {
      // Validate for priority update
      const validatedData = bulkPrioritySchema.parse(body);

      // Bulk update priority
      result = await bulkUpdateTaskPriority(
        validatedData.task_ids,
        validatedData.priority,
        updated_by
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Use ?action=status or ?action=priority",
        },
        { status: 400 }
      );
    }

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
    console.error("Error bulk updating tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
