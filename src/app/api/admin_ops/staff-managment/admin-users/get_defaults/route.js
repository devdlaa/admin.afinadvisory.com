import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { requirePermission } from "@/utils/server/requirePermission";

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "admin_users.access"
    );
    if (permissionError) return permissionError;

    // 1) load roles + roleDefaults from JSON file
    const filePath = path.join(
      process.cwd(),
      "src",
      "config",
      "permission_v2.json"
    );

    const fileData = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(fileData);

    const roles = json.roles || [];
    const roleDefaults = json.roleDefaults || {};

    // 2) load permissions from DB
    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        label: true,
        category: true,
      },
      orderBy: {
        category: "asc",
      },
    });
    
    // 3) send combined payload
    return NextResponse.json({
      success: true,
      data: {
        permissions,
        roles,
        roleDefaults,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error loading permissions/roles:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load permissions and roles",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
