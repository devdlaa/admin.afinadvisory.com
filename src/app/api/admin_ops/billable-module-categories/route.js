// app/api/billable-module-categories/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createBillableModuleCategory,
  listBillableModuleCategories,
} from "@/services/billableModuleCategory.service";

// Zod validation schema for POST
const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must not exceed 50 characters")
    .trim(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

// Zod validation schema for GET query parameters
const listCategoriesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  page_size: z.coerce.number().int().positive().max(20).optional().default(10),
  is_active: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
});

// POST - Create a new category
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = createCategorySchema.parse(body);

    // Create category
    const category = await createBillableModuleCategory(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: "Billable module category created successfully",
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
    console.error("Error creating billable module category:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - List all categories with pagination and filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Convert search params to object
    const params = {
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
      is_active: searchParams.get("is_active"),
      search: searchParams.get("search"),
    };

    // Remove null values
    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key]
    );

    // Validate query parameters
    const validatedParams = listCategoriesSchema.parse(params);

    // Get categories
    const result = await listBillableModuleCategories(validatedParams);

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
    console.error("Error listing billable module categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
