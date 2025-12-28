// app/api/task-templates/[id]/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getTaskTemplateById,
  updateTaskTemplate,
  deleteTaskTemplate,
} from "@/services/taskTemplate.service";

// Zod validation schema for UUID
const uuidSchema = z.string().uuid("Invalid template ID format");

// Zod validation schema for PATCH
const updateTemplateSchema = z.object({
  compliance_rule_id: z
    .string()
    .uuid("Invalid compliance rule ID format")
    .optional(),
  title_template: z
    .string()
    .min(1, "Title cannot be empty")
    .trim()
    .regex(
      /^[A-Za-z0-9 _-]+$/,
      "Title can only contain letters, numbers, spaces, hyphens, and underscores"
    )
    .optional(),
  description_template: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

// GET - Get a single task template by ID
export async function GET(request, { params }) {
  try {
    // Validate template ID
    const template_id = uuidSchema.parse(params.id);

    // Get template
    const template = await getTaskTemplateById(template_id);

    return NextResponse.json(
      {
        success: true,
        data: template,
      },
      { status: 200 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid template ID",
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
    console.error("Error fetching task template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update a task template
export async function PATCH(request, { params }) {
  try {
    // Validate template ID
    const template_id = uuidSchema.parse(params.id);

    const body = await request.json();

    // Validate request body
    const validatedData = updateTemplateSchema.parse(body);

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

    // Update template
    const template = await updateTaskTemplate(template_id, validatedData);

    return NextResponse.json(
      {
        success: true,
        data: template,
        message: "Task template updated successfully",
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
    console.error("Error updating task template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task template
export async function DELETE(request, { params }) {
  try {
    // Validate template ID
    const template_id = uuidSchema.parse(params.id);

    // Delete template
    const result = await deleteTaskTemplate(template_id);

    return NextResponse.json(
      {
        success: true,
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
          error: "Invalid template ID",
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
    console.error("Error deleting task template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
