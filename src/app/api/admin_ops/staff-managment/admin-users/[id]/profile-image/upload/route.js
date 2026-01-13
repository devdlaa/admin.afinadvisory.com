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
      "admin_users.update"
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

    // ---------- JPG validation ----------
    const allowedMimeTypes = ["image/jpeg", "image/jpg"];
    const allowedExtensions = ["jpg", "jpeg"];

    const fileName = file.name || "";
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeType = file.type;

    if (
      !allowedMimeTypes.includes(mimeType) ||
      !ext ||
      !allowedExtensions.includes(ext)
    ) {
      return createErrorResponse(
        "Only JPG images are allowed",
        400,
        "INVALID_FILE_TYPE",
        {
          allowed: ["jpg", "jpeg"],
          receivedType: mimeType,
          receivedExtension: ext,
        }
      );
    }
    // -----------------------------------

    const filePath = `${userId}.jpg`; // normalize to .jpg

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { upsert: true, contentType: "image/jpeg" });

    if (error) throw error;

    const publicUrl =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}` +
      `/storage/v1/object/public/${BUCKET}/${filePath}`;

    return createSuccessResponse("Profile image uploaded successfully", {
      url: publicUrl,
    });
  } catch (err) {
    console.error(err);

    return createErrorResponse(
      "Failed to upload profile image",
      500,
      "UPLOAD_ERROR",
      err?.message || "Unknown error"
    );
  }
}
