// app/api/task-templates/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createTaskTemplate,
  listTaskTemplates,
} from "@/services/taskTemplate.service";

// Zod validation schema for POST
const createTemplateSchema = z.object({
  compliance_rule_id: z.string().uuid("Invalid compliance rule ID format"),
  title_template: z
    .string()
    .min(1, "Title is required")
    .trim()
    .regex(
      /^[A-Za-z0-9 _-]+$/,
      "Title can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  description_template: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

// Zod validation schema for GET query parameters
const listTemplatesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(100).optional().default(10),
  is_active: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  compliance_rule_id: z.string().uuid("Invalid compliance rule ID format").optional(),
  search: z.string().optional(),
});

// POST - Create a new task template
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = createTemplateSchema.parse(body);

    // TODO: Get user ID from session/auth
    const created_by = request.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000000";

    // Create template
    const template = await createTaskTemplate(validatedData, created_by);

    return NextResponse.json(
      {
        success: true,
        data: template,
        message: "Task template created successfully",
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
    console.error("Error creating task template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - List all task templates with pagination and filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Convert search params to object
    const params = {
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
      is_active: searchParams.get("is_active"),
      compliance_rule_id: searchParams.get("compliance_rule_id"),
      search: searchParams.get("search"),
    };

    // Remove null values
    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key]
    );

    // Validate query parameters
    const validatedParams = listTemplatesSchema.parse(params);

    // Get templates
    const result = await listTaskTemplates(validatedParams);

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
    console.error("Error listing task templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}