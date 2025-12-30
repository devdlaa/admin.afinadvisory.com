import { supabase } from "@/lib/supabaseClient";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
import { uuidSchema } from "@/schemas";

const BUCKET = process.env.SUPERBASE_STORAGE_BUCKET_emp_images;

export async function POST(req, { params }) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;

    const userId = uuidSchema.parse(params.id);

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([
        `${userId}.png`,
        `${userId}.jpg`,
        `${userId}.jpeg`,
        `${userId}.webp`,
      ]);

    if (error) throw error;

    return createSuccessResponse("Profile image deleted successfully", {
      userId,
    });
  } catch (err) {
    return createErrorResponse(
      "Failed to delete profile image",
      500,
      "DELETE_ERROR",
      err.message
    );
  }
}
