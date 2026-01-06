import { NextResponse } from "next/server";

import { notify } from "@/services/shared/notifications.service";

export async function POST(request) {
  //   const [errorResponse, session] = await requirePermission(request);
//   if (errorResponse) return errorResponse;

  const { user_id, title, body } = await request.json();

  const targetUserId = user_id;

  await notify([targetUserId], {
    title: title || "Test notification",
    body: body || "If you can read this, push works",
    type: "GENERAL",
    link: "/dashboard",
  });

  return NextResponse.json({
    success: true,
    sent_to: targetUserId,
  });
}
