import razorpay from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { requirePermission } from "@/utils/server/requirePermission";
// Helper to convert paise to INR and format as ₹ with commas
function formatCurrency(amountInPaise) {
  return (amountInPaise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
}

// Helper to format date in "DD-MMM-YYYY" format
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function GET(req) {
  try {
    // Permission check placeholder
    const permissionCheck = await requirePermission(req, "payments.access");
    if (permissionCheck) return permissionCheck;

    // 1️⃣ Last processed settlement (most recent completed)
    const processedSettlements = razorpay.settlements.all({
      status: "processed",
      count: 1,
      skip: 0,
    });

    const lastProcessedAmount =
      processedSettlements?.items?.length > 0
        ? processedSettlements?.items[0]?.amount
        : 0;

    // 2️⃣ Total due in bank (all in_process settlements)
    const pendingSettlements = razorpay.settlements.all({
      status: "in_process",
      count: 100,
    });
    const totalDueInBank = pendingSettlements?.items?.reduce(
      (sum, s) => sum + s.amount,
      0
    );

    // 3️⃣ Upcoming settlement (next created settlement)
    const createdSettlements = razorpay.settlements.all({
      status: "created",
      count: 100,
    });

    const upcomingSettlement = createdSettlements?.items
      ?.filter((s) => s.amount > 0)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

    const upcomingSettlementAmount = upcomingSettlement
      ? upcomingSettlement.amount
      : 0;

    const upcomingSettlementDate = upcomingSettlement
      ? formatDate(upcomingSettlement.created_at)
      : null;

    // Return formatted response
    return NextResponse.json(
      {
        success: true,
        message: "Balance summary fetched successfully",
        data: {
          totalDueInBank: formatCurrency(totalDueInBank),
          lastProcessedAmount: formatCurrency(lastProcessedAmount),
          upcomingSettlementAmount: formatCurrency(upcomingSettlementAmount),
          upcomingSettlementDate,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to fetch balance summary",
        data: null,
      },
      { status: err.statusCode || 500 }
    );
  }
}
