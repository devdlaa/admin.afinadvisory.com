
import { supabase } from "@/lib/supabaseClient";
import { requirePermission } from "@/lib/requirePermission";
import { createSuccessResponse,createErrorResponse } from "@/utils/resposeHandlers";

const BUCKET = process.env.SUPERBASE_STORAGE_BUCKET_emp_images;

export async function POST(req) {
  try {
    const permissionCheck = await requirePermission(req, "users.update");
    if (permissionCheck) return permissionCheck;

    const { userId } = await req.json();
    
    if (!userId) {
      return createErrorResponse(
        "Missing userId",
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${userId}.png`]);

    if (error) throw error;

    return createSuccessResponse(
      "Profile image deleted successfully",
      { userId }
    );
  } catch (err) {
    return createErrorResponse(
      "Failed to delete profile image",
      500,
      "DELETE_ERROR",
      err.message
    );
  }
}