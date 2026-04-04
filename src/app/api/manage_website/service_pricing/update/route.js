import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";

import { requirePermission } from "@/utils/server/requirePermission";

// Environment variable for client secret
const CLIENT_REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
const CLIENT_BASE_URL =
  process.env.CLIENT_BASE_URL || "https://afinadvisory.com";

// Standardized response helpers
const createSuccessResponse = (message, data = null, status = 200) => {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
};

const createErrorResponse = (message, errors = null, status = 400) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Only include errors array if provided
  if (errors) {
    response.errors = Array.isArray(errors) ? errors : [errors];
  }

  return NextResponse.json(response, { status });
};

// Flexible validation schema - allows dynamic config objects
const schema = z.object({
  serviceId: z.string().min(1, "Service ID is required").trim(),
  slug: z.string().min(1, "Service slug is required").trim(),
  updatedConfig: z
    .object({
      serviceId: z.string().min(1, "Service ID in config is required"),
    })
    .passthrough() // Allows additional fields
    .refine(
      (config) => {
        // Basic validation for required structure
        return typeof config === "object" && config !== null;
      },
      {
        message: "Updated config must be a valid object",
      }
    ),
});

// Validate service configuration structure (basic checks)
function validateServiceConfig(config) {
  const errors = [];

  // Check for potentially dangerous fields (customize based on your needs)
  const dangerousFields = [];
  for (const field of dangerousFields) {
    if (field in config) {
      errors.push({
        field: `updatedConfig.${field}`,
        message: `Field '${field}' is not allowed in configuration`,
      });
    }
  }

  // Check for excessively deep nesting (prevent DoS)
  const maxDepth = 10;
  function getDepth(obj, currentDepth = 0) {
    if (currentDepth > maxDepth) return currentDepth;
    if (typeof obj !== "object" || obj === null) return currentDepth;

    return Math.max(
      ...Object.values(obj)?.map((val) => getDepth(val, currentDepth + 1)),
      currentDepth
    );
  }

  if (getDepth(config) > maxDepth) {
    errors.push({
      field: "updatedConfig",
      message: `Configuration object is too deeply nested (max depth: ${maxDepth})`,
    });
  }

  // Check JSON size (prevent excessively large payloads)
  const configSize = JSON.stringify(config).length;
  const maxSize = 10000; // 10KB limit
  if (configSize > maxSize) {
    errors.push({
      field: "updatedConfig",
      message: `Configuration is too large (${configSize} bytes, max: ${maxSize} bytes)`,
    });
  }

  return errors;
}

// Background revalidation and cache refresh
async function triggerClientRevalidation(slug, serviceId) {
  const operations = {
    revalidate: false,
    cacheClear: false,
  };

  try {
    // Trigger Next.js revalidation
    if (CLIENT_REVALIDATE_SECRET) {
    
      const revalidateRes = await fetch(`${CLIENT_BASE_URL}/api/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": CLIENT_REVALIDATE_SECRET,
        },
        body: JSON.stringify({ slug }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000),
      });

      console.log("revalidateRes", revalidateRes);
      operations.revalidate = revalidateRes.ok;

      if (!revalidateRes.ok) {
        console.warn(`Revalidation failed for ${slug}:`, revalidateRes.status);
      }
    }

    // Fire-and-forget fetch to trigger page regeneration
    const cacheRes = await fetch(`${CLIENT_BASE_URL}/service/${slug}`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    operations.cacheClear = cacheRes.ok;
  } catch (error) {
    console.error("Background revalidation failed:", {
      serviceId,
      slug,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  return operations;
}

const db = admin.firestore();

export async function POST(req) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "service_pricing.update"
    );
    if (permissionError) return permissionError;

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "Invalid request format",
        [{ field: "body", message: "Request body must be valid JSON" }],
        400
      );
    }

    // Validate input using Zod schema
    let validatedData;
    try {
      validatedData = schema.parse(body);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const formattedErrors = validationError?.errors?.map((error) => ({
          field: error.path.join("."),
          message: error.message,
          receivedValue: error.input,
        }));
        return createErrorResponse("Validation failed", formattedErrors, 400);
      }

      return createErrorResponse(
        "Data validation failed",
        [{ field: "validation", message: validationError.message }],
        400
      );
    }

    const { serviceId, slug, updatedConfig } = validatedData;

    // Validate serviceId consistency
    if (serviceId !== updatedConfig.serviceId) {
      return createErrorResponse(
        "Service ID mismatch",
        [
          {
            field: "serviceId",
            message:
              "Service ID in request body must match the one in updatedConfig",
          },
        ],
        400
      );
    }

    // Additional service config validation
    const configErrors = validateServiceConfig(updatedConfig);
    if (configErrors.length > 0) {
      return createErrorResponse(
        "Invalid service configuration",
        configErrors,
        400
      );
    }

    // Check if service exists
    const docRef = db.collection("service_pricing_configs").doc(serviceId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return createErrorResponse(
        "Service not found",
        [
          {
            field: "serviceId",
            message: `Service with ID '${serviceId}' does not exist`,
          },
        ],
        404
      );
    }

    // Update service configuration
    await docRef.set({
      ...updatedConfig,
      updatedAt: new Date().toISOString(),
      updatedBy: session?.user?.id,
    });

    // Trigger background revalidation (non-blocking)
    const revalidationPromise = triggerClientRevalidation(slug, serviceId);

    // Prepare response data
    const responseData = {
      serviceId,
      slug,
      configUpdated: true,
      timestamp: new Date().toISOString(),
      // Include summary of changes if needed for client
      summary: {
        fieldsUpdated: Object.keys(updatedConfig).length,
        configSize: JSON.stringify(updatedConfig).length,
      },
    };

    // Wait for revalidation to complete (with timeout)
    try {
      const revalidationOps = await Promise.race([
        revalidationPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Revalidation timeout")), 3000)
        ),
      ]);

      responseData.revalidation = revalidationOps;
    } catch (revalidationError) {
      responseData.revalidation = {
        revalidate: false,
        cacheClear: false,
        note: "Background revalidation may still be in progress",
      };
    }

    return createSuccessResponse(
      `Service configuration updated successfully for '${serviceId}'`,
      responseData,
      200
    );
  } catch (error) {
    // Log error for monitoring
    console.error("Service config update failed:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle specific Firebase errors
    if (error.code === "permission-denied") {
      return createErrorResponse(
        "Access denied",
        [
          {
            field: "permissions",
            message: "Insufficient permissions to update service configuration",
          },
        ],
        403
      );
    }

    if (error.code === "unavailable") {
      return createErrorResponse(
        "Service temporarily unavailable",
        [
          {
            field: "server",
            message:
              "Database service is currently unavailable. Please try again later.",
          },
        ],
        503
      );
    }

    if (error.code === "deadline-exceeded") {
      return createErrorResponse(
        "Request timeout",
        [
          {
            field: "server",
            message: "Operation took too long to complete. Please try again.",
          },
        ],
        408
      );
    }

    // Network errors from revalidation (shouldn't fail the main operation)
    if (error.name === "AbortError" || error.message.includes("fetch")) {
      return createSuccessResponse(
        "Service configuration updated (revalidation pending)",
        {
          serviceId: body?.serviceId,
          configUpdated: true,
          revalidation: {
            status: "failed",
            note: "Configuration was saved but cache refresh failed",
          },
          timestamp: new Date().toISOString(),
        },
        200
      );
    }

    // Generic server error
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error.message || "Internal server error"
        : "An unexpected error occurred while updating service configuration";

    return createErrorResponse(
      "Internal server error",
      [{ field: "server", message: errorMessage }],
      500
    );
  }
}
