import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper to format timestamps
function formatDate(timestamp) {
  return timestamp
    ? new Date(timestamp * 1000).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not Available";
}

// Aggregate downtime by payment method
function aggregateDowntime(items) {
  const grouped = {};

  items.forEach(item => {
    const method = item.method;
    if (!grouped[method]) grouped[method] = [];

    let instrumentInfo = "";
    if (item.instrument) {
      if (item.instrument.bank) instrumentInfo = item.instrument.bank;
      else if (item.instrument.vpa_handle) instrumentInfo = item.instrument.vpa_handle;
      else if (item.instrument.network) instrumentInfo = item.instrument.network;
    }

    grouped[method].push({
      status: item.status,                  // started / ended
      severity: item.severity,              // high / medium / low
      instrument: instrumentInfo,           // Bank, VPA, or Network
      begin: formatDate(item.begin),        // Downtime started
      end: item.end ? formatDate(item.end) : null,
      scheduled: item.scheduled,
      message: item.message || "",
    });
  });

  // Format for dashboard card
  const formatted = Object.keys(grouped).map(method => ({
    method,
    issues: grouped[method],
  }));

  return formatted;
}

export async function GET(req) {
  try {

     // Permission check placeholder
        const permissionCheck = await requirePermission(req, "payments.access");
        if (permissionCheck) return permissionCheck;
    // Fetch all payment downtime info
    const downtimeData = await razorpay.payments.fetchPaymentDowntime();

    const summary = aggregateDowntime(downtimeData.items);

    return NextResponse.json(
      {
        success: true,
        message: "Downtime summary fetched successfully",
        data: summary,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching downtime summary:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to fetch downtime summary",
        data: null,
      },
      { status: err.statusCode || 500 }
    );
  }
}
