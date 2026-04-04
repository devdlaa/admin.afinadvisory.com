import crypto from "crypto";

import { handleZoomWebhook } from "@/services/leadsManager/leadsActivity.service";

export async function POST(request) {
  const rawBody = await request.text();
  const payload = JSON.parse(rawBody);

  /* URL validation */

  if (payload.event === "endpoint.url_validation") {
    const plainToken = payload.payload.plainToken;

    const encryptedToken = crypto
      .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET)
      .update(plainToken)
      .digest("hex");

    return Response.json({
      plainToken,
      encryptedToken,
    });
  }

  /* Verify webhook signature */

  const signature = request.headers.get("x-zm-signature");
  const timestamp = request.headers.get("x-zm-request-timestamp");

  const message = `v0:${timestamp}:${rawBody}`;

  const hash = crypto
    .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET)
    .update(message)
    .digest("hex");

  if (`v0=${hash}` !== signature) {
    return new Response("Unauthorized", { status: 401 });
  }

  await handleZoomWebhook(payload);

  return Response.json({ success: true });
}
