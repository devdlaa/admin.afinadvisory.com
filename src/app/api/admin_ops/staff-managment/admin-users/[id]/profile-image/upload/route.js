
import { supabase } from "@/lib/supabaseClient";
import { requirePermission } from "@/utils/server/requirePermission";

import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/server/apiResponse";
import { uuidSchema } from "@/schemas";

const BUCKET = process.env.SUPERBASE_STORAGE_BUCKET_emp_images;

export async function POST(req, { params }) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;
    const { id } = await params;

    const userId = uuidSchema.parse(id);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return createErrorResponse(
        "Missing file",
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

    const publicUrl =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}` +
      `/storage/v1/object/public/${BUCKET}/${filePath}`;

    return createSuccessResponse("Profile image uploaded successfully", {
      url: publicUrl,
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
