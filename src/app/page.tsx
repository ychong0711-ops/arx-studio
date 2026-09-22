import { Dashboard } from "@/components/dashboard/dashboard";
import { ToastProvider } from "@/components/ui";
import { ensureDemoData, listProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  await ensureDemoData();
  const summaries = await listProjects();
  return (
    <ToastProvider>
      <Dashboard summaries={summaries} />
    </ToastProvider>
  );
}
