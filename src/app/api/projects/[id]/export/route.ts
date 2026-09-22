import { NextResponse } from "next/server";
import { generateArxml } from "@/lib/arxml";
import { getFullProject } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const full = await getFullProject(id);
  if (!full) {
    return new NextResponse("Project not found", { status: 404 });
  }
  const xml = generateArxml(full);
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${full.project.arPackageRoot}.arxml"`,
      "Cache-Control": "no-store",
    },
  });
}
