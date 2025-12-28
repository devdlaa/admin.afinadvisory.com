// app/api/dashboard/overview/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import { getDashboardOverview } from "@/services/overview.service";

// Zod validation schema for user_id (optional - can get from auth)
const userIdSchema = z.string().uuid("Invalid user ID format");

// GET - Get dashboard overview (role-based)
export async function GET(request) {
  try {
    // TODO: Get user ID from session/auth
    // For now, check query param or header
    const { searchParams } = new URL(request.url);
    const userIdFromQuery = searchParams.get("user_id");
    const userIdFromHeader = request.headers.get("x-user-id");

    const user_id = userIdFromQuery || userIdFromHeader;

    if (!user_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User ID is required. Provide via query param ?user_id=<uuid> or x-user-id header",
        },
        { status: 400 }
      );
    }

    // Validate user ID
    const validated_user_id = userIdSchema.parse(user_id);

    // Get dashboard overview
    const overview = await getDashboardOverview(validated_user_id);

    return NextResponse.json(
      {
        success: true,
        data: overview,
      },
      { status: 200 }
    );
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user ID format",
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
    console.error("Error fetching dashboard overview:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
