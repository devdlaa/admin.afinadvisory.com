import { NextResponse } from "next/server";
import { auth } from "@/utils/server/auth";

export async function requirePermission(req, required) {
  const session = await auth();

  // Not authenticated
  if (!session) {
    const res = new NextResponse("Unauthorized", { status: 401 });
    return [res, null];
  }

  if (
    required === undefined ||
    required === null ||
    (Array.isArray(required) && required.length === 0)
  ) {
    return [null, session];
  }

  // Normalize required permissions into array
  const requiredArray = Array.isArray(required) ? required : [required];
  const userPermissions = session.user?.permissions || [];

  // Check permissions
  const hasAll = requiredArray.every((perm) => userPermissions.includes(perm));

  if (!hasAll) {
    const res = NextResponse.json(
      {
        success: false,
        error: {
          message: "Access Denied",
          code: "",
          details: {
            errors: ["Access Denied", "Ask Admin to Provide Permission"],
          },
          timestamp: new Date().toISOString(),
        },
      },
      { status: 403 }
    );

    return [res, session];
  }

  return [null, session];
}
