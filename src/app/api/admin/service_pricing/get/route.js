import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const configDir = path.join(process.cwd(), "src/config/pricing");

    // Find the latest generated static JSON file
    const files = fs
      .readdirSync(configDir)
      .filter(
        (file) =>
          file.startsWith("service_pricing_static.") && file.endsWith(".json")
      )
      .sort()
      .reverse();

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No static service config found" },
        { status: 404 }
      );
    }

    // Pick the most recent one
    const latestFile = files[0];
    const filePath = path.join(configDir, latestFile);

    const rawData = fs.readFileSync(filePath, "utf-8");
    const services = JSON.parse(rawData);

    return NextResponse.json({
      timestamp: latestFile
        .replace("service_pricing_static.", "")
        .replace(".json", ""),
      services,
    });
  } catch (error) {
    console.error("❌ Error fetching static config:", error);
    return NextResponse.json(
      { error: "Failed to fetch static config" },
      { status: 500 }
    );
  }
}
