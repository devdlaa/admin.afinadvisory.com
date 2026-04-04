export const runtime = "nodejs";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { getClientIp } from "@/utils/server/utils";
import { schemas } from "@/schemas";
import crypto from "crypto";
const MARKETING_API_KEY = process.env.MARKETING_API_KEY;
import {
  handleExternalLeadInit,
  handleExternalLeadProgress,
} from "@/services/leadsManager/leadCore.service";

function verifySignature(rawBody, signature) {
  const expected = crypto
    .createHmac("sha256", MARKETING_API_KEY)
    .update(rawBody)
    .digest("hex");

  if (!signature || expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request) {
  try {
    const rawBody = await request.text();

    if (!rawBody) {
      throw new Error("Empty request body");
    }

    const signature = request.headers.get("x-signature");
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey || apiKey !== MARKETING_API_KEY) {
      throw new Error("Unauthorized: Invalid API key");
    }

    if (!signature) {
      throw new Error("Unauthorized: Missing signature");
    }

    const isValid = verifySignature(rawBody, signature);

    if (!isValid) {
      throw new Error("Unauthorized: Invalid signature");
    }

    let body;
    let ip_address;
    try {
      body = JSON.parse(rawBody);
      ip_address = getClientIp(request);
    } catch (err) {
      throw new Error("Invalid JSON body");
    }

    if (!body || typeof body !== "object") {
      throw new Error("Malformed request body");
    }

    let result;

    /* ---------- ROUTING ---------- */
    if (body.action === "INIT") {
      const parsed = schemas.lead.external_website_lead_init.safeParse(body);

      if (!parsed.success) {
        throw new Error("Invalid INIT payload");
      }

      result = await handleExternalLeadInit({
        ...parsed.data,
        ip_address,
      });
    } else if (body.action === "PROGRESS") {
      const parsed =
        schemas.lead.external_website_lead_progress.safeParse(body);

      if (!parsed.success) {
        throw new Error("Invalid PROGRESS payload");
      }

      result = await handleExternalLeadProgress({
        ...parsed.data,
      });
    } else {
      throw new Error("Invalid action type");
    }

    /* ---------- SUCCESS ---------- */
    return createSuccessResponse("Success", result);
  } catch (error) {
    return handleApiError(error);
  }
}
