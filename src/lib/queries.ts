import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  connections,
  dataTypes,
  interfaces,
  ports,
  projects,
  runnables,
  softwareComponents,
  type ProjectRow,
} from "@/db/schema";
import type { FullProject } from "@/lib/types";
import { seedDemoProject } from "@/lib/seed";

export interface ProjectSummary {
  project: ProjectRow;
  swcCount: number;
  interfaceCount: number;
  dataTypeCount: number;
  portCount: number;
  runnableCount: number;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  type G = { key: string; count: number };
  const [comps, ifaces, dts]: [G[], G[], G[]] = await Promise.all([
    db
      .select({ key: softwareComponents.projectId, count: count() })
      .from(softwareComponents)
      .where(inArray(softwareComponents.projectId, ids))
      .groupBy(softwareComponents.projectId),
    db
      .select({ key: interfaces.projectId, count: count() })
      .from(interfaces)
      .where(inArray(interfaces.projectId, ids))
      .groupBy(interfaces.projectId),
    db
      .select({ key: dataTypes.projectId, count: count() })
      .from(dataTypes)
      .where(inArray(dataTypes.projectId, ids))
      .groupBy(dataTypes.projectId),
  ]);

  const swcList = await db
    .select({
      id: softwareComponents.id,
      projectId: softwareComponents.projectId,
    })
    .from(softwareComponents)
    .where(inArray(softwareComponents.projectId, ids));
  const swcToProject = new Map(swcList.map((s) => [s.id, s.projectId]));
  const swcIds = swcList.map((s) => s.id);

  const [portGroups, runGroups]: [G[], G[]] =
    swcIds.length > 0
      ? await Promise.all([
          db
            .select({ key: ports.componentId, count: count() })
            .from(ports)
            .where(inArray(ports.componentId, swcIds))
            .groupBy(ports.componentId),
          db
            .select({ key: runnables.componentId, count: count() })
            .from(runnables)
            .where(inArray(runnables.componentId, swcIds))
            .groupBy(runnables.componentId),
        ])
      : [[], []];

  const perProject = (groups: G[]) => {
    const m = new Map<string, number>();
    for (const g of groups) {
      const pid = swcToProject.get(g.key);
      if (pid) m.set(pid, (m.get(pid) ?? 0) + Number(g.count));
    }
    return m;
  };
  const portMap = perProject(portGroups);
  const runMap = perProject(runGroups);

  const of = (arr: G[]) => new Map(arr.map((r) => [r.key, Number(r.count)]));
  const compMap = of(comps);
  const ifaceMap = of(ifaces);
  const dtMap = of(dts);

  return rows.map((p) => ({
    project: p,
    swcCount: compMap.get(p.id) ?? 0,
    interfaceCount: ifaceMap.get(p.id) ?? 0,
    dataTypeCount: dtMap.get(p.id) ?? 0,
    portCount: portMap.get(p.id) ?? 0,
    runnableCount: runMap.get(p.id) ?? 0,
  }));
}

export async function getFullProject(
  projectId: string,
): Promise<FullProject | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) return null;

  const [comps, ifaces, dts, conns] = await Promise.all([
    db
      .select()
      .from(softwareComponents)
      .where(eq(softwareComponents.projectId, projectId)),
    db
      .select()
      .from(interfaces)
      .where(eq(interfaces.projectId, projectId)),
    db
      .select()
      .from(dataTypes)
      .where(eq(dataTypes.projectId, projectId)),
    db
      .select()
      .from(connections)
      .where(eq(connections.projectId, projectId)),
  ]);

  const compIds = comps.map((c) => c.id);
  type PortQ = typeof ports.$inferSelect;
  type RunQ = typeof runnables.$inferSelect;
  let allPorts: PortQ[] = [];
  let allRunnables: RunQ[] = [];
  if (compIds.length > 0) {
    [allPorts, allRunnables] = await Promise.all([
      db.select().from(ports).where(inArray(ports.componentId, compIds)),
      db.select().from(runnables).where(inArray(runnables.componentId, compIds)),
    ]);
  }

  const order = (a: { createdAt: Date }, b: { createdAt: Date }) =>
    a.createdAt.getTime() - b.createdAt.getTime();

  return {
    project,
    components: comps
      .map((c) => ({
        ...c,
        ports: allPorts.filter((p) => p.componentId === c.id).sort(order),
        runnables: allRunnables
          .filter((r) => r.componentId === c.id)
          .sort(order),
      }))
      .sort(order),
    interfaces: ifaces.sort(order),
    dataTypes: dts.sort(order),
    connections: conns.sort(order),
  };
}

/** 첫 실행 시 데모 프로젝트 자동 시드 */
export async function ensureDemoData(): Promise<void> {
  try {
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .limit(1);
    if (existing.length === 0) {
      await seedDemoProject();
    }
  } catch {
    // DB 미초기화 상태에서는 조용히 무시
  }
}
