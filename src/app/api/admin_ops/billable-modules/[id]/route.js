// app/api/billable-modules/[id]/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getBillableModuleById,
  updateBillableModule,
  deleteBillableModule,
} from "@/services/billableModule.service";

// Zod validation schema for UUID
const uuidSchema = z.string().uuid("Invalid module ID format");

// Zod validation schema for PATCH
const updateModuleSchema = z.object({
  name: z
    .string()
    .min(1, "Module name cannot be empty")
    .max(255, "Module name must not exceed 255 characters")
    .trim()
    .regex(
      /^[A-Za-z0-9\- ]+$/,
      "Module name can only contain letters, numbers, spaces, and hyphens"
    )
    .optional(),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid("Invalid category ID format").optional().nullable(),
  is_active: z.boolean().optional(),
});

// GET - Get a single billable module by ID
export async function GET(request, { params }) {
  try {
    // Validate module ID
    const module_id = uuidSchema.parse(params.id);

    // Get module
    const module = await getBillableModuleById(module_id);

    return NextResponse.json(
      {
        success: true,
        data: module,
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
    console.error("Error fetching billable module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update a billable module
export async function PATCH(request, { params }) {
  try {
    // Validate module ID
    const module_id = uuidSchema.parse(params.id);

    const body = await request.json();

    // Validate request body
    const validatedData = updateModuleSchema.parse(body);

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
    // For now using a placeholder - replace with actual auth
    const updated_by = request.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000000";

    // Update module
    const module = await updateBillableModule(
      module_id,
      validatedData,
      updated_by
    );

    return NextResponse.json(
      {
        success: true,
        data: module,
        message: "Billable module updated successfully",
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
    console.error("Error updating billable module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a billable module
export async function DELETE(request, { params }) {
  try {
    // Validate module ID
    const module_id = uuidSchema.parse(params.id);

    // TODO: Get user ID from session/auth
    // For now using a placeholder - replace with actual auth
    const deleted_by = request.headers.get("x-user-id") || "00000000-0000-0000-0000-000000000000";

    // Delete module
    await deleteBillableModule(module_id, deleted_by);

    return NextResponse.json(
      {
        success: true,
        message: "Billable module deleted successfully",
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
    console.error("Error deleting billable module:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}