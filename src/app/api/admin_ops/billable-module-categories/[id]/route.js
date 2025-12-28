// app/api/billable-module-categories/[id]/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getBillableModuleCategoryById,
  updateBillableModuleCategory,
  deleteBillableModuleCategory,
} from "@/services/billableModuleCategory.service";

// Zod validation schema for UUID
const uuidSchema = z.string().uuid("Invalid category ID format");

// Zod validation schema for PATCH
const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(50, "Name must not exceed 50 characters")
    .trim()
    .optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

// GET - Get a single category by ID
export async function GET(request, { params }) {
  try {
    // Validate category ID
    const category_id = uuidSchema.parse(params.id);

    // Get category
    const category = await getBillableModuleCategoryById(category_id);

    return NextResponse.json(
      {
        success: true,
        data: category,
      },
      { status: 200 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid category ID",
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
    console.error("Error fetching billable module category:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// PATCH - Update a category
export async function PATCH(request, { params }) {
  try {
    // Validate category ID
    const category_id = uuidSchema.parse(params.id);

    const body = await request.json();

    // Validate request body
    const validatedData = updateCategorySchema.parse(body);

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

    // Update category
    const category = await updateBillableModuleCategory(
      category_id,
      validatedData
    );

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: "Billable module category updated successfully",
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
    console.error("Error updating billable module category:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a category
export async function DELETE(request, { params }) {
  try {
    // Validate category ID
    const category_id = uuidSchema.parse(params.id);

    // Delete category
    const result = await deleteBillableModuleCategory(category_id);

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
          error: "Invalid category ID",
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
    console.error("Error deleting billable module category:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
