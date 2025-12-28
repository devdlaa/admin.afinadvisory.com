// app/api/tasks/modules/[module_id]/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  updateTaskModule,
  deleteTaskModule,
} from "@/services/taskModule.service";

// Zod validation schema for module_id
const moduleIdSchema = z.string().uuid("Invalid module ID format");

// Zod validation schema for PATCH
const updateTaskModuleSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  remark: z.string().optional().nullable(),
});

// PATCH - Update task module metadata
export async function PATCH(request, { params }) {
  try {
    // Validate module ID
    const module_id = moduleIdSchema.parse(params.module_id);

    const body = await request.json();

    // Validate request body
    const validatedData = updateTaskModuleSchema.parse(body);

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
    const admin_id =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    // Update module
    const module = await updateTaskModule(module_id, validatedData, admin_id);

    return NextResponse.json(
      {
        success: true,
        data: module,
        message: "Task module updated successfully",
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
    console.error("Error updating task module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete task module
export async function DELETE(request, { params }) {
  try {
    // Validate module ID
    const module_id = moduleIdSchema.parse(params.module_id);

    // TODO: Get user ID from session/auth
    const admin_id =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    // Delete module
    await deleteTaskModule(module_id, admin_id);

    return NextResponse.json(
      {
        success: true,
        message: "Task module deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid module ID",
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
    console.error("Error deleting task module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
