import { NextResponse } from "next/server";

import { getAssignmentCountsPerUser } from "@/services/task/assignment.service";

// GET - Get assignment counts per user (reporting)
export async function GET(request) {
  try {
    // Get assignment counts
    const counts = await getAssignmentCountsPerUser();

    return NextResponse.json(
      {
        success: true,
        data: counts,
      },
      { status: 200 }
    );
  } catch (error) {
    // Generic server error
    console.error("Error fetching assignment counts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
