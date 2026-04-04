
import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { ZodError } from "zod";

export const createSuccessResponse = (
  message, data = null, meta = null) => {
  return NextResponse.json({
    success: true,
    message,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  });
};

export const createErrorResponse = (
  message,
  statusCode = 500,
  errorCode = null,
  details = null
) => {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
};

/* ============================
   Error → Response Adapter
============================ */

export const handleApiError = (error) => {
  if (error instanceof ZodError) {
    return createErrorResponse(
      "Validation failed",
      400,
      "VALIDATION_ERROR",
      error.issues
    );
  }

  if (error instanceof AppError) {
    return createErrorResponse(
      error.message,
      error.statusCode,
      error.code,
      error.details
    );
  }

  console.error(error);

  return createErrorResponse("Internal Server Error", 500, "INTERNAL_ERROR");
};
