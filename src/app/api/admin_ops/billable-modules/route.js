// app/api/billable-modules/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createBillableModule,
  listBillableModules,
} from "@/services/billableModule.service";

// Zod validation schema for POST
const createModuleSchema = z.object({
  name: z
    .string()
    .min(1, "Module name is required")
    .max(255, "Module name must not exceed 255 characters")
    .trim()
    .regex(
      /^[A-Za-z0-9\- ]+$/,
      "Module name can only contain letters, numbers, spaces, and hyphens"
    ),
  description: z.string().optional().nullable(),
  category_id: z
    .string()
    .uuid("Invalid category ID format")
    .optional()
    .nullable(),
  is_active: z.boolean().optional().default(true),
});

// Zod validation schema for GET query parameters
const listModulesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(100).optional().default(10),
  is_active: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  category_id: z.string().uuid("Invalid category ID format").optional(),
  search: z.string().optional(),
});

// POST - Create a new billable module
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = createModuleSchema.parse(body);

    // TODO: Get user ID from session/auth
    // For now using a placeholder - replace with actual auth
    const created_by =
      request.headers.get("x-user-id") ||
      "00000000-0000-0000-0000-000000000000";

    // Create module
    const module = await createBillableModule(validatedData, created_by);

    return NextResponse.json(
      {
        success: true,
        data: module,
        message: "Billable module created successfully",
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
    console.error("Error creating billable module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - List all billable modules with pagination and filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Convert search params to object
    const params = {
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
      is_active: searchParams.get("is_active"),
      category_id: searchParams.get("category_id"),
      search: searchParams.get("search"),
    };

    // Remove null values
    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key]
    );

    // Validate query parameters
    const validatedParams = listModulesSchema.parse(params);

    // Get modules
    const result = await listBillableModules(validatedParams);

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
    console.error("Error listing billable modules:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
