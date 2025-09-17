import { NextRequest, NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Token is required",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    const result = await response.json();

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "Verification successful"
        : "Verification failed",
    });
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error during verification",
      },
      { status: 500 }
    );
  }
}
