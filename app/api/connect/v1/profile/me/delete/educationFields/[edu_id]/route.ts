import { NextRequest } from "next/server";
import { deleteEducation } from "@/lib/educationFunctions";

export async function DELETE(
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

  return deleteEducation(req, edu_id);
}
