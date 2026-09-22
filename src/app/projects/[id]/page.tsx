import { notFound } from "next/navigation";
import { ToastProvider } from "@/components/ui";
import { Workspace } from "@/components/workspace/workspace";
import { getFullProject } from "@/lib/queries";
import { validateProject } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const full = await getFullProject(id);
  if (!full) notFound();
  const issues = validateProject(full);

  return (
    <ToastProvider>
      <Workspace full={full} issues={issues} />
    </ToastProvider>
  );
}
