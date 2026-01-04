import { NextResponse } from "next/server";
import { prisma } from "@/utils/server/db";
import { compare } from "bcrypt";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check deleted
    if (user.deleted_at) {
      return NextResponse.json(
        { success: false, error: "This account has been deleted" },
        { status: 403 }
      );
    }

    // Check suspended
    if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "Your account has been suspended. Please contact support.",
        },
        { status: 403 }
      );
    }

    if (!user.onboarding_completed) {
      return NextResponse.json(
        {
          success: false,
          error: "Please complete your onboarding process first.",
        },
        { status: 403 }
      );
    }

    // Check password exists
    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error: "Password not set. Please complete onboarding.",
        },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid  Email or credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      requires2FA: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
