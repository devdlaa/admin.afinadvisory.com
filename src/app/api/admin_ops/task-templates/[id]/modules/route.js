import { NextResponse } from "next/server";
import { listTemplateModules } from "@/services/taskTemplateModule.service";
import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid task template id");

export async function GET(request, { params }) {
  try {
    const task_template_id = uuidSchema.parse(params.id);

    const modules = await listTemplateModules({ task_template_id });

    return NextResponse.json({
      success: true,
      data: modules,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
