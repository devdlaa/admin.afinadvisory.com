// Upload API
import { supabase } from "@/lib/supabaseClient";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

const BUCKET = process.env.SUPERBASE_STORAGE_BUCKET_emp_images;

export async function POST(req) {
  try {
    const permissionCheck = await requirePermission(
      req,
      "users.profile_image.profile_image"
    );
    if (permissionCheck) return permissionCheck;

    const formData = await req.formData();
    const file = formData.get("file");
    const userId = formData.get("userId");

    if (!file || !userId) {
      return createErrorResponse(
        "Missing file or userId",
        400,
        "MISSING_REQUIRED_FIELDS"
      );
    }

    const ext = file.name.split(".").pop();
    const filePath = `${userId}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;

    return createSuccessResponse("Profile image uploaded successfully", {
      url: publicUrl,
      filePath,
    });
  } catch (err) {
    return createErrorResponse(
      "Failed to upload profile image",
      500,
      "UPLOAD_ERROR",
      err.message
    );
  }
}
