import { NextResponse } from "next/server";
import { prisma } from "@/utils/server/db.js";
import fs from "fs/promises";
import path from "path";
import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "admin_users.access",
    );
    if (permissionError) return permissionError;

    const filePath = path.join(
      process.cwd(),
      "src",
      "config",
      "permission_v2.json",
    );

    const fileData = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(fileData);

    const roles = json.roles || [];
    const roleDefaults = json.roleDefaults || {};

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

    const validPermissionCodes = new Set(permissions.map((p) => p.code));

    const filteredRoleDefaults = Object.fromEntries(
      Object.entries(roleDefaults).map(([role, perms]) => [
        role,
        perms.filter((code) => validPermissionCodes.has(code)),
      ]),
    );

    const missingPermissions = Object.fromEntries(
      Object.entries(roleDefaults).map(([role, perms]) => [
        role,
        perms.filter((code) => !validPermissionCodes.has(code)),
      ]),
    );

    return NextResponse.json({
      success: true,
      data: {
        permissions,
        roles,
        roleDefaults: filteredRoleDefaults,
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
      { status: 500 },
    );
  }
}
