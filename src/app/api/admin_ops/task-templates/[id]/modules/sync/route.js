import { NextResponse } from "next/server";
import { z } from "zod";
import { syncTemplateModules } from "@/services/taskTemplateModule.service";

const uuidSchema = z.string().uuid("Invalid task template id");

const syncSchema = z.object({
  modules: z
    .array(
      z.object({
        billable_module_id: z.string().uuid(),
        is_optional: z.boolean().optional(),
      })
    )
    .default([]),
});

export async function POST(request, { params }) {
  try {
    const task_template_id = uuidSchema.parse(params.id);

    const body = await request.json();
    const { modules } = syncSchema.parse(body);

    const result = await syncTemplateModules(task_template_id, modules);

    return NextResponse.json(
      {
        success: true,
        message: "Template modules synced successfully",
        data: result,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
