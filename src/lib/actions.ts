"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  connections,
  dataTypes,
  interfaces,
  ports,
  projects,
  runnables,
  softwareComponents,
} from "@/db/schema";
import { generateArxml } from "@/lib/arxml";
import type { ImportPayload } from "@/lib/importer";
import { getFullProject } from "@/lib/queries";
import { generateRteFiles, type CodeFile } from "@/lib/rte";
import { seedDemoProject } from "@/lib/seed";
import {
  isValidShortName,
  type CsOperation,
  type SrElement,
  type SwcCategory,
} from "@/lib/types";

type Result<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const ok = <T,>(data?: T): Result<T> => ({ ok: true, data });
const fail = (error: string): Result => ({ ok: false, error });

function validName(name: string, label: string): string | null {
  if (!isValidShortName(name)) {
    return `${label} SHORT-NAME은 영문/숫자/밑줄만 사용 가능하고 영문 또는 밑줄로 시작해야 합니다.`;
  }
  return null;
}

/** PG 유니크 제약 위반(code 23505) 등 DB 에러를 사용자 친화 메시지로 변환 */
function friendlyDbError(e: unknown, fallback: string): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "23505"
  )
    return "이미 동일한 이름의 항목이 존재합니다.";
  return e instanceof Error ? e.message : fallback;
}

// ── Project ──────────────────────────────────────────────────

export async function createProject(input: {
  name: string;
  arPackageRoot: string;
  autosarVersion: string;
  schema: string;
  description: string;
}): Promise<Result<{ id: string }>> {
  const err = validName(input.arPackageRoot, "AR-PACKAGE");
  if (err) return fail(err);
  if (!input.name.trim()) return fail("프로젝트 이름을 입력하세요.");
  try {
    const [row] = await db
      .insert(projects)
      .values({
        name: input.name.trim(),
        arPackageRoot: input.arPackageRoot.trim(),
        autosarVersion: input.autosarVersion,
        schema: input.schema,
        description: input.description,
      })
      .returning({ id: projects.id });
    return ok({ id: row.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "프로젝트 생성 실패");
  }
}

export async function deleteProject(id: string): Promise<Result> {
  await db.delete(projects).where(eq(projects.id, id));
  return ok();
}

export async function touchProject(id: string): Promise<void> {
  await db
    .update(projects)
    .set({ updatedAt: new Date() })
    .where(eq(projects.id, id));
}

export async function createDemoProject(): Promise<Result<{ id: string }>> {
  try {
    const id = await seedDemoProject();
    return ok({ id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "데모 생성 실패");
  }
}

// ── SWC ──────────────────────────────────────────────────────

interface PortInput {
  id?: string;
  name: string;
  direction: "provided" | "required";
  interfaceId: string | null;
  queued: boolean;
}

interface RunnableInput {
  id?: string;
  name: string;
  eventType: string;
  periodMs: number;
  operationPort: string;
}

export async function upsertSwc(input: {
  id?: string;
  projectId: string;
  name: string;
  category: string;
  description: string;
  ports: PortInput[];
  runnables: RunnableInput[];
}): Promise<Result<{ id: string }>> {
  const err = validName(input.name, "SWC");
  if (err) return fail(err);
  for (const p of input.ports) {
    const e = validName(p.name, "포트");
    if (e) return fail(e);
  }
  for (const r of input.runnables) {
    const e = validName(r.name, "Runnable");
    if (e) return fail(e);
  }

  try {
    const swcId = await db.transaction(async (tx) => {
      let swcId = input.id;
      if (swcId) {
        await tx
          .update(softwareComponents)
          .set({
            name: input.name,
            category: input.category as SwcCategory,
            description: input.description,
          })
          .where(eq(softwareComponents.id, swcId));
      } else {
        const [row] = await tx
          .insert(softwareComponents)
          .values({
            projectId: input.projectId,
            name: input.name,
            category: input.category,
            description: input.description,
            x: 120 + Math.floor(Math.random() * 200),
            y: 120 + Math.floor(Math.random() * 200),
          })
          .returning({ id: softwareComponents.id });
        swcId = row.id;
      }

      // Ports diff
      const existing = await tx
        .select({ id: ports.id })
        .from(ports)
        .where(eq(ports.componentId, swcId!));
      const keep = new Set(input.ports.map((p) => p.id).filter(Boolean));
      const remove = existing.map((p) => p.id).filter((id) => !keep.has(id));
      if (remove.length > 0) {
        await tx.delete(ports).where(inArray(ports.id, remove));
      }
      for (const p of input.ports) {
        const values = {
          name: p.name,
          direction: p.direction,
          interfaceId: p.interfaceId,
          queued: p.queued,
        };
        if (p.id) {
          await tx.update(ports).set(values).where(eq(ports.id, p.id));
        } else {
          await tx
            .insert(ports)
            .values({ ...values, componentId: swcId! });
        }
      }

      // Runnables diff
      const existingR = await tx
        .select({ id: runnables.id })
        .from(runnables)
        .where(eq(runnables.componentId, swcId!));
      const keepR = new Set(input.runnables.map((r) => r.id).filter(Boolean));
      const removeR = existingR
        .map((r) => r.id)
        .filter((id) => !keepR.has(id));
      if (removeR.length > 0) {
        await tx.delete(runnables).where(inArray(runnables.id, removeR));
      }
      for (const r of input.runnables) {
        const values = {
          name: r.name,
          eventType: r.eventType,
          periodMs: r.periodMs,
          operationPort: r.operationPort,
        };
        if (r.id) {
          await tx.update(runnables).set(values).where(eq(runnables.id, r.id));
        } else {
          await tx
            .insert(runnables)
            .values({ ...values, componentId: swcId! });
        }
      }
      return swcId!;
    });
    await touchProject(input.projectId);
    return ok({ id: swcId });
  } catch (e) {
    return fail(friendlyDbError(e, "SWC 저장 실패"));
  }
}

export async function deleteSwc(id: string, projectId: string): Promise<Result> {
  await db.delete(softwareComponents).where(eq(softwareComponents.id, id));
  await touchProject(projectId);
  return ok();
}

export async function moveSwc(
  id: string,
  x: number,
  y: number,
): Promise<Result> {
  await db
    .update(softwareComponents)
    .set({ x: Math.round(x), y: Math.round(y) })
    .where(eq(softwareComponents.id, id));
  return ok();
}

// ── Interface ────────────────────────────────────────────────

export async function upsertInterface(input: {
  id?: string;
  projectId: string;
  name: string;
  kind: string;
  elements: SrElement[] | CsOperation[];
}): Promise<Result<{ id: string }>> {
  const err = validName(input.name, "인터페이스");
  if (err) return fail(err);
  try {
    if (input.id) {
      await db
        .update(interfaces)
        .set({
          name: input.name,
          kind: input.kind,
          elements: input.elements as unknown[],
        })
        .where(eq(interfaces.id, input.id));
      await touchProject(input.projectId);
      return ok({ id: input.id });
    }
    const [row] = await db
      .insert(interfaces)
      .values({
        projectId: input.projectId,
        name: input.name,
        kind: input.kind,
        elements: input.elements as unknown[],
      })
      .returning({ id: interfaces.id });
    await touchProject(input.projectId);
    return ok({ id: row.id });
  } catch (e) {
    return fail(friendlyDbError(e, "인터페이스 저장 실패"));
  }
}

export async function deleteInterface(
  id: string,
  projectId: string,
): Promise<Result> {
  await db.delete(interfaces).where(eq(interfaces.id, id));
  await touchProject(projectId);
  return ok();
}

// ── DataType ─────────────────────────────────────────────────

export async function upsertDataType(input: {
  id?: string;
  projectId: string;
  name: string;
  category: string;
  baseType: string;
  lowerLimit: string;
  upperLimit: string;
  unit: string;
  elementType?: string;
  maxSize?: number;
  elements?: { name: string; typeRef: string }[];
}): Promise<Result<{ id: string }>> {
  const err = validName(input.name, "데이터타입");
  if (err) return fail(err);
  try {
    if (input.id) {
      await db
        .update(dataTypes)
        .set({
          name: input.name,
          category: input.category,
          baseType: input.baseType,
          lowerLimit: input.lowerLimit,
          upperLimit: input.upperLimit,
          unit: input.unit,
          elementType: input.elementType ?? "",
          maxSize: input.maxSize ?? 0,
          elements: input.elements ?? [],
        })
        .where(eq(dataTypes.id, input.id));
      await touchProject(input.projectId);
      return ok({ id: input.id });
    }
    const [row] = await db
      .insert(dataTypes)
      .values({
        projectId: input.projectId,
        name: input.name,
        category: input.category,
        baseType: input.baseType,
        lowerLimit: input.lowerLimit,
        upperLimit: input.upperLimit,
        unit: input.unit,
        elementType: input.elementType ?? "",
        maxSize: input.maxSize ?? 0,
        elements: input.elements ?? [],
      })
      .returning({ id: dataTypes.id });
    await touchProject(input.projectId);
    return ok({ id: row.id });
  } catch (e) {
    return fail(friendlyDbError(e, "데이터타입 저장 실패"));
  }
}

export async function deleteDataType(
  id: string,
  projectId: string,
): Promise<Result> {
  await db.delete(dataTypes).where(eq(dataTypes.id, id));
  await touchProject(projectId);
  return ok();
}

// ── Connection ───────────────────────────────────────────────

export async function createConnection(input: {
  projectId: string;
  sourcePortId: string;
  targetPortId: string;
}): Promise<Result<{ id: string }>> {
  if (input.sourcePortId === input.targetPortId) {
    return fail("동일한 포트끼리는 연결할 수 없습니다.");
  }
  try {
    const [row] = await db
      .insert(connections)
      .values(input)
      .returning({ id: connections.id });
    await touchProject(input.projectId);
    return ok({ id: row.id });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "연결 생성 실패");
  }
}

export async function deleteConnection(
  id: string,
  projectId: string,
): Promise<Result> {
  await db.delete(connections).where(eq(connections.id, id));
  await touchProject(projectId);
  return ok();
}

// ── Export ───────────────────────────────────────────────────

export async function getArxml(
  projectId: string,
): Promise<Result<{ arxml: string }>> {
  const full = await getFullProject(projectId);
  if (!full) return fail("프로젝트를 찾을 수 없습니다.");
  return ok({ arxml: generateArxml(full) });
}

export async function getRteFiles(
  projectId: string,
): Promise<Result<{ files: CodeFile[] }>> {
  const full = await getFullProject(projectId);
  if (!full) return fail("프로젝트를 찾을 수 없습니다.");
  return ok({ files: generateRteFiles(full) });
}

// ── Auto Layout ──────────────────────────────────────────────

export async function layoutSwcPositions(
  projectId: string,
  positions: { id: string; x: number; y: number }[],
): Promise<Result> {
  try {
    await db.transaction(async (tx) => {
      for (const p of positions) {
        await tx
          .update(softwareComponents)
          .set({ x: Math.round(p.x), y: Math.round(p.y) })
          .where(eq(softwareComponents.id, p.id));
      }
    });
    await touchProject(projectId);
    return ok();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "정렬 저장 실패");
  }
}

// ── Project Duplicate ────────────────────────────────────────

export async function duplicateProject(
  id: string,
): Promise<Result<{ id: string }>> {
  const full = await getFullProject(id);
  if (!full) return fail("프로젝트를 찾을 수 없습니다.");
  try {
    const newId = await db.transaction(async (tx) => {
      const [np] = await tx
        .insert(projects)
        .values({
          name: `${full.project.name}_Copy`,
          arPackageRoot: `${full.project.arPackageRoot}Copy`,
          autosarVersion: full.project.autosarVersion,
          schema: full.project.schema,
          description: full.project.description,
        })
        .returning({ id: projects.id });

      const ifMap = new Map<string, string>();
      for (const f of full.interfaces) {
        const [row] = await tx
          .insert(interfaces)
          .values({
            projectId: np.id,
            name: f.name,
            kind: f.kind,
            elements: f.elements,
          })
          .returning({ id: interfaces.id });
        ifMap.set(f.id, row.id);
      }
      for (const d of full.dataTypes) {
        await tx.insert(dataTypes).values({
          projectId: np.id,
          name: d.name,
          category: d.category,
          baseType: d.baseType,
          lowerLimit: d.lowerLimit,
          upperLimit: d.upperLimit,
          unit: d.unit,
          elementType: d.elementType ?? "",
          maxSize: d.maxSize ?? 0,
          elements: d.elements ?? [],
        });
      }
      const portMap = new Map<string, string>();
      for (const c of full.components) {
        const [row] = await tx
          .insert(softwareComponents)
          .values({
            projectId: np.id,
            name: c.name,
            category: c.category,
            description: c.description,
            x: c.x,
            y: c.y,
          })
          .returning({ id: softwareComponents.id });
        for (const p of c.ports) {
          const [pr] = await tx
            .insert(ports)
            .values({
              componentId: row.id,
              name: p.name,
              direction: p.direction,
              interfaceId: p.interfaceId ? (ifMap.get(p.interfaceId) ?? null) : null,
              queued: p.queued,
            })
            .returning({ id: ports.id });
          portMap.set(p.id, pr.id);
        }
        for (const r of c.runnables) {
          await tx.insert(runnables).values({
            componentId: row.id,
            name: r.name,
            eventType: r.eventType,
            periodMs: r.periodMs,
            operationPort: r.operationPort,
          });
        }
      }
      for (const cn of full.connections) {
        const s = portMap.get(cn.sourcePortId);
        const t = portMap.get(cn.targetPortId);
        if (s && t) {
          await tx.insert(connections).values({
            projectId: np.id,
            sourcePortId: s,
            targetPortId: t,
          });
        }
      }
      return np.id;
    });
    return ok({ id: newId });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "프로젝트 복제 실패");
  }
}

// ── ARXML Import ─────────────────────────────────────────────

export async function importProject(
  payload: ImportPayload,
): Promise<Result<{ id: string }>> {
  const err = validName(payload.arPackageRoot, "AR-PACKAGE");
  if (err) return fail(err);
  try {
    const id = await db.transaction(async (tx) => {
      const [np] = await tx
        .insert(projects)
        .values({
          name: payload.name || payload.arPackageRoot,
          arPackageRoot: payload.arPackageRoot,
          autosarVersion: "R23-11",
          schema: "classic",
          description: "ARXML에서 임포트된 프로젝트",
        })
        .returning({ id: projects.id });

      for (const d of payload.dataTypes) {
        if (!isValidShortName(d.name)) continue;
        await tx.insert(dataTypes).values({
          projectId: np.id,
          name: d.name,
          category: d.category,
          baseType: d.baseType,
          lowerLimit: d.lowerLimit,
          upperLimit: d.upperLimit,
          unit: d.unit,
          elementType: d.elementType,
          maxSize: d.maxSize,
          elements: d.elements,
        });
      }

      const ifByName = new Map<string, string>();
      for (const f of payload.interfaces) {
        if (!isValidShortName(f.name) || ifByName.has(f.name)) continue;
        const [row] = await tx
          .insert(interfaces)
          .values({
            projectId: np.id,
            name: f.name,
            kind: f.kind,
            elements: f.elements as unknown[],
          })
          .returning({ id: interfaces.id });
        ifByName.set(f.name, row.id);
      }

      const portByPath = new Map<string, string>();
      const compSeen = new Set<string>();
      let cx = 60;
      let cy = 60;
      for (const c of payload.components) {
        if (!isValidShortName(c.name) || compSeen.has(c.name)) continue;
        compSeen.add(c.name);
        const [row] = await tx
          .insert(softwareComponents)
          .values({
            projectId: np.id,
            name: c.name,
            category: c.category,
            description: c.description,
            x: cx,
            y: cy,
          })
          .returning({ id: softwareComponents.id });
        cx += 300;
        if (cx > 900) {
          cx = 60;
          cy += 220;
        }
        for (const p of c.ports) {
          if (!isValidShortName(p.name)) continue;
          const [pr] = await tx
            .insert(ports)
            .values({
              componentId: row.id,
              name: p.name,
              direction: p.direction,
              interfaceId: p.interfaceName
                ? (ifByName.get(p.interfaceName) ?? null)
                : null,
              queued: p.queued,
            })
            .returning({ id: ports.id });
          portByPath.set(`${c.name}/${p.name}`, pr.id);
        }
        for (const r of c.runnables) {
          if (!isValidShortName(r.name)) continue;
          await tx.insert(runnables).values({
            componentId: row.id,
            name: r.name,
            eventType: r.eventType,
            periodMs: r.periodMs,
            operationPort: r.operationPort,
          });
        }
      }

      for (const cn of payload.connections) {
        const s = portByPath.get(`${cn.providerSwc}/${cn.providerPort}`);
        const t = portByPath.get(`${cn.requesterSwc}/${cn.requesterPort}`);
        if (s && t) {
          await tx.insert(connections).values({
            projectId: np.id,
            sourcePortId: s,
            targetPortId: t,
          });
        }
      }
      return np.id;
    });
    return ok({ id });
  } catch (e) {
    return fail(friendlyDbError(e, "임포트 실패"));
  }
}
