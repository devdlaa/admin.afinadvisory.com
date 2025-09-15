import { NextResponse } from "next/server";

export const createSuccessResponse = (message, data = null, meta = null) => {
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
