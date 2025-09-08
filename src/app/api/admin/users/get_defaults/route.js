import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "/src/config/permissions.json");

    // Read JSON file asynchronously
    const fileData = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileData);

    return NextResponse.json({
      success: true,
      data: jsonData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error reading roles-permissions.json:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load permissions",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
