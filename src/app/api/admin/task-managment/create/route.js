import fadmin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
import {
  TaskCreateSchema,
  calculatePaymentMetrics,
} from "@/app/schemas/UserSchema/TaskSchema";

function canManageFinance(user) {
  if (user.role === "superAdmin") return true;

  return user.permissions?.includes("finance.manage") || false;
}

export async function POST(request) {
  try {
    // Get session
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse(
        "Unauthorized - Please login to continue",
        401,
        "AUTH_REQUIRED"
      );
    }

    const user = session.user;
    const hasFinanceAccess = canManageFinance(user);

    // Parse request body
    const body = await request.json();

    const {
      business,
      type,
      client,
      particulars,
      lifecycle,
      charges = [],
      dates = {},
      checklist = [],
    } = body;

    if (!type || !client?.name || !particulars?.name) {
      return createErrorResponse(
        "Missing required fields: type, client.name, and particulars.name are required",
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }
    const now = fadmin.firestore.Timestamp.now();

    // Validate required fields
    if (
      !business?.id ||
      !business?.name ||
      !business?.email ||
      !business?.phone
    ) {
      return createErrorResponse(
        "Missing required business fields",
        400,
        "MISSING_REQUIRED_FIELDS",
        {
          required: [
            "business.id",
            "business.name",
            "business.email",
            "business.phone",
          ],
          received: {
            businessId: !!business?.id,
            businessName: !!business?.name,
            businessEmail: !!business?.email,
            businessPhone: !!business?.phone,
          },
        }
      );
    }

    // Process charges based on finance permission
    let processedCharges = [];

    if (charges.length > 0) {
      // Non-finance users: block if they try to set amounts
      if (!hasFinanceAccess) {
        const hasAmounts = charges.some((c) => c.amount && c.amount > 0);
        if (hasAmounts) {
          return createErrorResponse(
            "You don't have permission to set charge amounts",
            403,
            "FINANCE_PERMISSION_REQUIRED",
            {
              message:
                "Only users with finance permission can manage pricing and charges",
            }
          );
        }
      }

      processedCharges = charges.map((charge, index) => {
        if (!charge.name) {
          throw new Error(`Charge ${index + 1}: name is required`);
        }

        // Validate required fields for finance users
        if (hasFinanceAccess) {
          if (!charge.category || !charge.bearer) {
            throw new Error(
              `Charge ${index + 1}: category and bearer are required`
            );
          }
        }

        if (!hasFinanceAccess) {
          if (charge.category === "external_charge" && !charge.remarks) {
            throw new Error(
              `Charge ${index + 1}: remarks are required for external charges`
            );
          }
        }
        return {
          id: `charge_${Date.now()}_${index}`,
          name: charge.name,
          amount: hasFinanceAccess ? charge.amount || 0 : 0,
          category: charge.category,
          bearer: charge.bearer,
          status: charge.status || "unpaid",
          remarks: charge.remarks || null,
          createdAt: now,
          paidAt: null,
          writtenOffAt: null,
        };
      });
    }

    const restrictedStatuses = ["completed", "canceled"];

    if (!hasFinanceAccess && lifecycle?.status) {
      if (restrictedStatuses.includes(lifecycle.status)) {
        return createErrorResponse(
          "You don't have permission to set this task status",
          403,
          "STATUS_NOT_ALLOWED",
          {
            allowedStatuses: [
              "in_progress",
              "follow_up_required",
              "pending_client_approval",
            ],
          }
        );
      }
    }

    const validatedStatus =
      restrictedStatuses.includes(lifecycle?.status) && !hasFinanceAccess
        ? "in_progress"
        : lifecycle?.status || "in_progress";

    // Calculate payment metrics
    const paymentMetrics = calculatePaymentMetrics(processedCharges);

    // Validate client phone format
    if (client.phone && !client.phone.startsWith("+")) {
      return createErrorResponse(
        "Invalid phone number format",
        400,
        "INVALID_PHONE_FORMAT",
        {
          message: "Phone number must include country code (e.g., +91)",
        }
      );
    }

    const processedChecklist = checklist.map((item, index) => ({
      id: `check_${Date.now()}_${index}`,
      title: item.title,
      done: item.done || false,
      createdAt: now,
      updatedAt: now,
      updatedBy: user.userCode,
    }));

    // Build task object
    const taskData = {
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        phone: business.phone,
      },
      type,

      client: {
        id: client.id || null,
        name: client.name,
        prefered_lang: client.prefered_lang || "English",
        phone: client.phone || null,
      },

      particulars: {
        name: particulars.name,
        category: particulars.category || null,
        description: particulars.description || null,
        internalTags: particulars.internalTags || [],
      },

      checklist: processedChecklist,
      assignment: {
        assignToAll: false,
        members: [],
        createdById: user.userCode,
        createdByName: user.name,
        createdAt: now,
        assignedKeys: [],
      },

      lifecycle: {
        status: validatedStatus,
        priority: lifecycle?.priority || "normal",
      },

      dates: {
        createdAt: now,
        updatedAt: now,
        startDate: now,
        completedAt: dates.completedAt
          ? fadmin.firestore.Timestamp.fromDate(new Date(dates.completedAt))
          : null,
      },

      payment: paymentMetrics,

      paymentLinks: [],

      audit: {
        lastStatusChangedById: user.userCode,
        lastStatusChangedAt: now,
      },

      flags: {
        softDeleted: false,
      },
    };

    // Validate with Zod schema
    const validation = TaskCreateSchema.safeParse(taskData);
    if (!validation.success) {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        validation.error.errors
      );
    }

    // Save to Firestore
    const db = fadmin.firestore();
    const tasksRef = db.collection("tasks");
    const docRef = await tasksRef.add(validation.data);

    // Get created task with ID
    const createdTask = {
      id: docRef.id,
      ...validation.data,
    };

    return createSuccessResponse("Task created successfully", createdTask, {
      taskId: docRef.id,
      createdBy: user.name,
    });
  } catch (error) {
    console.error("Error creating task:", error);

    return createErrorResponse(
      error.message || "Failed to create task",
      500,
      "INTERNAL_SERVER_ERROR",
      {
        error: error.toString(),
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }
    );
  }
}
