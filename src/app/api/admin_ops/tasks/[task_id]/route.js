// app/api/tasks/[id]/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import { getTaskById, updateTask, deleteTask } from "@/services/task.service";

// Zod validation schema for UUID
const uuidSchema = z.string().uuid("Invalid task ID format");

// Zod validation schema for PATCH
const updateTaskSchema = z.object({
  entity_registration_id: z
    .string()
    .uuid("Invalid registration ID format")
    .optional()
    .nullable(),

  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(255, "Title too long")
    .optional(),

  description: z.string().optional().nullable(),

  status: z
    .enum([
      "PENDING",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "ON_HOLD",
      "PENDING_CLIENT_INPUT",
    ])
    .optional(),

  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),

  // Accepts ISO date string or null
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),

  task_category_id: z
    .string()
    .uuid("Invalid category ID format")
    .optional()
    .nullable(),

  period_start: z.string().datetime().optional().nullable(),
  period_end: z.string().datetime().optional().nullable(),

  financial_year: z.string().optional().nullable(),
  period_label: z.string().optional().nullable(),
});

// GET - Get a single task by ID
export async function GET(request, { params }) {
  try {
    // Validate task ID
    const task_id = uuidSchema.parse(params.id);

    // Get task
    const task = await getTaskById(task_id);

    return NextResponse.json(
      {
        success: true,
        data: task,
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
    console.error("Error fetching task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update a task
export async function PATCH(request, { params }) {
  try {
    // Validate task ID
    const task_id = uuidSchema.parse(params.id);

    const body = await request.json();

    // Validate request body
    const validatedData = updateTaskSchema.parse(body);

    // Check if at least one field is provided
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one field must be provided for update",
        },
        { status: 400 }
      );
    }

    // TODO: Get user ID from session/auth
    const updated_by =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    // Update task
    const task = await updateTask(task_id, validatedData, updated_by);

    return NextResponse.json(
      {
        success: true,
        data: task,
        message: "Task updated successfully",
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
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a task
export async function DELETE(request, { params }) {
  try {
    // Validate task ID
    const task_id = uuidSchema.parse(params.id);

    // TODO: Get user ID from session/auth
    const deleted_by =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    // Delete task
    const result = await deleteTask(task_id, deleted_by);

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.task,
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
    console.error("Error deleting task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
