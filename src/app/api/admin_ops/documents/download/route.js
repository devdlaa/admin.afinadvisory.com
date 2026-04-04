import { getFileStream } from "@/services/shared/miniio.service";
import { requirePermission } from "@/utils/server/requirePermission";
import { handleApiError } from "@/utils/server/apiResponse";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return new Response("Missing file key", { status: 400 });
    }

    const stream = await getFileStream(key);

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    const filename = decodeURIComponent(key.split("/").pop());

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
 
    return handleApiError(error);
  }
}
