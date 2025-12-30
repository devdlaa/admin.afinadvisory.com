import { NextResponse } from "next/server";
import { auth } from "@/utils/server/auth";

export async function requirePermission(req, required) {
  const session = await auth();

  if (!session) {
    const res = new NextResponse("Unauthorized", { status: 401 });
    return [res, null];
  }

  const userPermissions = session.user?.permissions || [];
  const requiredArray = Array.isArray(required) ? required : [required];
  const hasAll = requiredArray.every((perm) =>
    userPermissions.includes(perm)
  );

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
