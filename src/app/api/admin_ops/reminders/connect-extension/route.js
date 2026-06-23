import { NextResponse } from "next/server";
import { requirePermission } from "@/utils/server/requirePermission";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(req);
    if (permissionError) return permissionError;

    if (!process.env.EXTENSION_TOKEN_SECRET) {
      return NextResponse.json(
        { error: "Extension token secret not configured" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { existingToken } = body;

    if (existingToken) {
      try {
        const decoded = jwt.verify(
          existingToken,
          process.env.EXTENSION_TOKEN_SECRET,
        );

        // Valid + belongs to this user → no need to issue a new one
        if (
          decoded.sub === String(admin_user.id) &&
          decoded.scope === "reminder_extension"
        ) {
          return NextResponse.json({ alreadyConnected: true });
        }
      } catch {
        // Token expired or invalid — fall through to issue a fresh one
      }
    }

    const token = jwt.sign(
      {
        sub: String(admin_user.id),
        role: admin_user.admin_role,
        scope: "reminder_extension",
      },
      process.env.EXTENSION_TOKEN_SECRET,
      { expiresIn: "30d" },
    );

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[connect-extension]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
