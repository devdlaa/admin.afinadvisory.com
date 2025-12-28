// app/api/tasks/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import { createTask, listTasks } from "@/services/task.service";

// Zod validation schema for POST
const createTaskSchema = z.object({
  entity_id: z.string().uuid("Invalid entity ID format"),
  entity_registration_id: z
    .string()
    .uuid("Invalid registration ID format")
    .optional()
    .nullable(),

  title: z.string().min(1, "Title is required").max(255, "Title too long"),
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
    .optional()
    .default("PENDING"),

  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("LOW"),

  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),

  task_category_id: z
    .string()
    .uuid("Invalid category ID format")
    .optional()
    .nullable(),
  compliance_rule_id: z
    .string()
    .uuid("Invalid compliance rule ID format")
    .optional()
    .nullable(),

  period_start: z.string().datetime().optional().nullable(),
  period_end: z.string().datetime().optional().nullable(),
  financial_year: z.string().optional().nullable(),
  period_label: z.string().optional().nullable(),
});

// Zod validation schema for GET query parameters
const listTasksSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(100).optional().default(20),

  entity_id: z.string().uuid("Invalid entity ID").optional(),
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
  task_category_id: z.string().uuid("Invalid category ID").optional(),
  compliance_rule_id: z.string().uuid("Invalid compliance rule ID").optional(),
  registration_type_id: z
    .string()
    .uuid("Invalid registration type ID")
    .optional(),
  created_by: z.string().uuid("Invalid user ID").optional(),
  assigned_to: z.string().uuid("Invalid user ID").optional(),

  due_date_from: z.string().datetime().optional(),
  due_date_to: z.string().datetime().optional(),

  search: z.string().optional(),

  sort_by: z.enum(["due_date", "priority", "created_at"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

// POST - Create a new task
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = createTaskSchema.parse(body);

    // TODO: Get user ID from session/auth
    const created_by =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    // Create task
    const task = await createTask(validatedData, created_by);

    return NextResponse.json(
      {
        success: true,
        data: task,
        message: "Task created successfully",
      },
      { status: 201 }
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
    console.error("Error creating task:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - List all tasks with filters and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Convert search params to object
    const params = {
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
      entity_id: searchParams.get("entity_id"),
      status: searchParams.get("status"),
      priority: searchParams.get("priority"),
      task_category_id: searchParams.get("task_category_id"),
      compliance_rule_id: searchParams.get("compliance_rule_id"),
      registration_type_id: searchParams.get("registration_type_id"),
      created_by: searchParams.get("created_by"),
      assigned_to: searchParams.get("assigned_to"),
      due_date_from: searchParams.get("due_date_from"),
      due_date_to: searchParams.get("due_date_to"),
      search: searchParams.get("search"),
      sort_by: searchParams.get("sort_by"),
      sort_order: searchParams.get("sort_order"),
    };

    // Remove null values
    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key]
    );

    // Validate query parameters
    const validatedParams = listTasksSchema.parse(params);

    // Get tasks
    const result = await listTasks(validatedParams);

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Generic server error
    console.error("Error listing tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
