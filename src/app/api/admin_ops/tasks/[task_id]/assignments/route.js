// app/api/tasks/[task_id]/assignments/route.js

import { NextResponse } from "next/server";
import { z } from "zod";


import { syncTaskAssignments,getAssignmentsByTaskId } from "@/services/task/assignment.service";

// Zod validation schema for task_id
const taskIdSchema = z.string().uuid("Invalid task ID format");

// Zod validation schema for POST (sync assignments)
const syncAssignmentsSchema = z.object({
  user_ids: z
    .array(z.string().uuid("Invalid user ID format"))
    .optional()
    .default([]),
  assigned_to_all: z.boolean().optional().default(false),
});

// POST - Sync task assignments
export async function POST(request, { params }) {
  try {
    // Validate task ID
    const task_id = taskIdSchema.parse(params.task_id);

    const body = await request.json();

    // Validate request body
    const validatedData = syncAssignmentsSchema.parse(body);

    // TODO: Get user ID from session/auth
    const updated_by = request.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000000";

    // Sync assignments
    const result = await syncTaskAssignments(
      task_id,
      validatedData.user_ids,
      validatedData.assigned_to_all,
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
    console.error("Error syncing task assignments:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - Get all assignments for a task
export async function GET(request, { params }) {
  try {
    // Validate task ID
    const task_id = taskIdSchema.parse(params.task_id);

    // Get assignments
    const assignments = await getAssignmentsByTaskId(task_id);

    return NextResponse.json(
      {
        success: true,
        data: assignments,
      },
      { status: 200 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid task ID",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Generic server error
    console.error("Error fetching task assignments:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}