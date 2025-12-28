// app/api/tasks/[task_id]/modules/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  syncTaskModules,
  listTaskModules,
} from "@/services/taskModule.service";

// Zod validation schema for task_id
const taskIdSchema = z.string().uuid("Invalid task ID format");

// Zod validation schema for POST (sync modules)
const syncModulesSchema = z.object({
  billable_module_ids: z
    .array(z.string().uuid("Invalid module ID format"))
    .min(0, "Module IDs must be an array"),
});

// POST - Sync task modules (replace all modules with provided list)
export async function POST(request, { params }) {
  try {
    // Validate task ID
    const task_id = taskIdSchema.parse(params.task_id);

    const body = await request.json();

    // Validate request body
    const validatedData = syncModulesSchema.parse(body);

    // TODO: Get user ID from session/auth
    const admin_id =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    // Sync modules
    const result = await syncTaskModules(
      task_id,
      validatedData.billable_module_ids,
      admin_id
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: "Task modules synced successfully",
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
    console.error("Error syncing task modules:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - List all active modules for a task
export async function GET(request, { params }) {
  try {
    // Validate task ID
    const task_id = taskIdSchema.parse(params.task_id);

    // Get modules
    const modules = await listTaskModules(task_id);

    return NextResponse.json(
      {
        success: true,
        data: modules,
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
    console.error("Error listing task modules:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
