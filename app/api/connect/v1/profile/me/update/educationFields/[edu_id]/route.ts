import { NextRequest } from "next/server";
import { updateEducation } from "@/lib/educationFunctions";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ edu_id: string }> }
) {
  const { edu_id } = await context.params;

  if (!edu_id) {
    return new Response(
      JSON.stringify({ error: "Missing education id" }),
      { status: 400 }
    );
  }

  return updateEducation(req, edu_id);
}
