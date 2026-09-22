"use client";

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowDownToLine, ArrowUpFromLine, Cpu, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui";
import {
  createConnection,
  deleteConnection,
  deleteSwc,
  layoutSwcPositions,
  moveSwc,
} from "@/lib/actions";
import { SWC_CATEGORIES, type FullProject } from "@/lib/types";

interface PortInfo {
  id: string;
  name: string;
  direction: "provided" | "required";
  ifaceName: string;
  ifaceKind: string | null;
}

type SwcNodeData = {
  label: string;
  category: string;
  desc: string;
  ports: PortInfo[];
  runCount: number;
};
type SwcNodeType = Node<SwcNodeData, "swc">;

/* ── 커스텀 SWC 노드 ─────────────────────────────── */
function SwcNode({ data, selected }: NodeProps<SwcNodeType>) {
  const cat = SWC_CATEGORIES.find((c) => c.value === data.category);
  const pPorts = data.ports.filter((p) => p.direction === "provided");
  const rPorts = data.ports.filter((p) => p.direction === "required");
  const rows = Math.max(pPorts.length, rPorts.length, 1);

  return (
    <div
      className={`w-[236px] rounded-xl border bg-ink-850/95 shadow-panel backdrop-blur transition-colors ${
        selected ? "border-accent shadow-glow" : "border-line-bright"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-ink-800 text-accent">
          <Cpu className="h-3.5 w-3.5" strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[12.5px] font-semibold tracking-tight text-snow">
            {data.label}
          </div>
          <div className="font-mono text-[8.5px] tracking-[0.16em] text-fog uppercase">
            {cat?.label ?? data.category} · {data.runCount} RUN
          </div>
        </div>
      </div>
      <div>
        {Array.from({ length: rows }).map((_, i) => {
          const r = rPorts[i];
          const p = pPorts[pPorts.length - rows + i];
          return (
            <div
              key={i}
              className="relative flex items-center justify-between border-b border-line/50 px-3 py-[7px] font-mono text-[10px] last:border-0"
            >
              <div className="min-w-0">
                {r && (
                  <div className="flex items-center gap-1.5 text-amberx">
                    <ArrowDownToLine className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.name}</span>
                    <span className="truncate text-fog/50">{r.ifaceName}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 text-right">
                {p && (
                  <div className="flex items-center justify-end gap-1.5 text-mint">
                    <span className="truncate text-fog/50">{p.ifaceName}</span>
                    <span className="truncate">{p.name}</span>
                    <ArrowUpFromLine className="h-3 w-3 shrink-0" />
                  </div>
                )}
              </div>
              {r && (
                <Handle
                  type="target"
                  id={r.id}
                  position={Position.Left}
                  className="!h-2.5 !w-2.5 !border-2 !border-ink-950 !bg-amberx"
                  style={{ left: -5, top: "50%", transform: "translateY(-50%)" }}
                />
              )}
              {p && (
                <Handle
                  type="source"
                  id={p.id}
                  position={Position.Right}
                  className="!h-2.5 !w-2.5 !border-2 !border-ink-950 !bg-mint"
                  style={{ right: -5, top: "50%", transform: "translateY(-50%)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { swc: SwcNode };

/* ── 그래프 빌드 ─────────────────────────────────── */
function buildGraph(full: FullProject): { nodes: SwcNodeType[]; edges: Edge[] } {
  const portToSwc = new Map<string, string>();
  const portInfo = new Map<string, PortInfo>();
  for (const c of full.components) {
    for (const p of c.ports) {
      portToSwc.set(p.id, c.id);
      const iface = full.interfaces.find((f) => f.id === p.interfaceId);
      portInfo.set(p.id, {
        id: p.id,
        name: p.name,
        direction: p.direction as "provided" | "required",
        ifaceName: iface?.name ?? "",
        ifaceKind: iface?.kind ?? null,
      });
    }
  }

  const nodes: SwcNodeType[] = full.components.map((c) => ({
    id: c.id,
    type: "swc",
    position: { x: c.x, y: c.y },
    data: {
      label: c.name,
      category: c.category,
      desc: c.description,
      runCount: c.runnables.length,
      ports: c.ports
        .map((p) => portInfo.get(p.id)!)
        .sort((a, b) => a.direction.localeCompare(b.direction)),
    },
  }));

  const edges: Edge[] = full.connections
    .filter(
      (cn) => portToSwc.has(cn.sourcePortId) && portToSwc.has(cn.targetPortId),
    )
    .map((cn) => {
      const src = portInfo.get(cn.sourcePortId)!;
      const tgt = portInfo.get(cn.targetPortId)!;
      const provided = src.direction === "provided" ? src : tgt;
      const required = src.direction === "required" ? src : tgt;
      const isCs = provided.ifaceKind === "client-server";
      return {
        id: cn.id,
        source: portToSwc.get(provided.id)!,
        sourceHandle: provided.id,
        target: portToSwc.get(required.id)!,
        targetHandle: required.id,
        animated: true,
        style: {
          stroke: isCs ? "#9b87f5" : "#2ecdf7",
          strokeWidth: 1.6,
        },
        label: provided.ifaceName,
        labelStyle: { fill: "#94a3b8", fontSize: 9, fontFamily: "var(--font-mono)" },
        labelBgStyle: { fill: "#0c1018", fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: isCs ? "#9b87f5" : "#2ecdf7",
        },
      };
    });

  return { nodes, edges };
}

/* ── 캔버스 ──────────────────────────────────────── */
export function TopologyFlow({ full }: { full: FullProject }) {
  const toast = useToast();
  const router = useRouter();
  const initial = useMemo(() => buildGraph(full), [full]);
  const [nodes, setNodes] = useNodesState(initial.nodes);
  const [edges, setEdges] = useEdgesState(initial.edges);

  useEffect(() => {
    const g = buildGraph(full);
    setNodes((prev) =>
      g.nodes.map((n) => {
        const cur = prev.find((p) => p.id === n.id);
        return cur ? { ...n, position: cur.position, selected: cur.selected } : n;
      }),
    );
    setEdges(g.edges);
  }, [full, setNodes, setEdges]);

  const portLookup = useMemo(() => {
    const m = new Map<string, PortInfo & { swcId: string }>();
    for (const c of full.components) {
      for (const p of c.ports) {
        const iface = full.interfaces.find((f) => f.id === p.interfaceId);
        m.set(p.id, {
          id: p.id,
          name: p.name,
          direction: p.direction as "provided" | "required",
          ifaceName: iface?.name ?? "",
          ifaceKind: iface?.kind ?? null,
          swcId: c.id,
        });
      }
    }
    return m;
  }, [full]);

  const onNodesChange = useCallback(
    async (changes: NodeChange<SwcNodeType>[]) => {
      const removed = changes.filter((c) => c.type === "remove");
      setNodes((ns) => applyNodeChanges(changes, ns));
      for (const c of changes) {
        if (c.type === "position" && c.dragging === false && c.position) {
          await moveSwc(c.id, c.position.x, c.position.y);
        }
      }
      for (const r of removed) {
        const swc = full.components.find((c) => c.id === r.id);
        await deleteSwc(r.id, full.project.id);
        toast(`SWC '${swc?.name ?? ""}'이(가) 삭제되었습니다.`);
        router.refresh();
      }
    },
    [setNodes, full, router, toast],
  );

  const onEdgesChange = useCallback(
    async (changes: EdgeChange<Edge>[]) => {
      for (const c of changes) {
        if (c.type === "remove") {
          await deleteConnection(c.id, full.project.id);
          toast("커넥터가 삭제되었습니다.");
          router.refresh();
        }
      }
      // 엣지 상태는 refresh 이후 서버 데이터로 재구축
    },
    [full.project.id, router, toast],
  );

  /** 계층형 자동 배치: 소스(센서) → 처리(앱) → 싱크(액추에이터) */
  const autoLayout = useCallback(async () => {
    const colOf = new Map<string, number>();
    const consumers = new Set<string>();
    const producers = new Set<string>();
    for (const cn of full.connections) {
      const s = portLookup.get(cn.sourcePortId);
      const t = portLookup.get(cn.targetPortId);
      if (s) producers.add(s.swcId);
      if (t && t.direction === "required") consumers.add(t.swcId);
    }
    for (const c of full.components) {
      const isProducer = producers.has(c.id);
      const isConsumer = consumers.has(c.id);
      colOf.set(
        c.id,
        isProducer && !isConsumer ? 0 : isConsumer && !isProducer ? 2 : 1,
      );
    }
    // 연결 없는 노드는 포트 방향으로 추정
    for (const c of full.components) {
      if (producers.has(c.id) || consumers.has(c.id)) continue;
      const pCount = c.ports.filter((p) => p.direction === "provided").length;
      const rCount = c.ports.filter((p) => p.direction === "required").length;
      colOf.set(c.id, pCount > 0 && rCount === 0 ? 0 : rCount > 0 && pCount === 0 ? 2 : 1);
    }

    const columns: Record<number, typeof full.components> = { 0: [], 1: [], 2: [] };
    for (const c of full.components) columns[colOf.get(c.id)!].push(c);

    const COL_X = [40, 470, 920];
    const positions: { id: string; x: number; y: number }[] = [];
    for (const col of [0, 1, 2] as const) {
      const list = columns[col];
      const totalH = list.length * 170;
      const startY = Math.max(40, 300 - totalH / 2);
      list.forEach((c, i) => {
        positions.push({ id: c.id, x: COL_X[col], y: startY + i * 170 });
      });
    }
    setNodes((ns) =>
      ns.map((n) => {
        const p = positions.find((x) => x.id === n.id);
        return p ? { ...n, position: { x: p.x, y: p.y } } : n;
      }),
    );
    await layoutSwcPositions(full.project.id, positions);
    toast("자동 정렬이 적용되었습니다.");
  }, [full, portLookup, setNodes, toast]);

  const onConnect = useCallback(
    async (conn: Connection) => {
      if (!conn.sourceHandle || !conn.targetHandle) return;
      const src = portLookup.get(conn.sourceHandle);
      const tgt = portLookup.get(conn.targetHandle);
      if (!src || !tgt) return;

      if (src.direction !== "provided" || tgt.direction !== "required") {
        toast("P-Port(제공) → R-Port(요구) 방향으로만 연결할 수 있습니다.", "error");
        return;
      }
      if (src.ifaceKind && tgt.ifaceKind && src.ifaceKind !== tgt.ifaceKind) {
        toast("서로 다른 종류의 인터페이스는 연결할 수 없습니다.", "error");
        return;
      }
      const dup = full.connections.some(
        (c) =>
          (c.sourcePortId === src.id && c.targetPortId === tgt.id) ||
          (c.sourcePortId === tgt.id && c.targetPortId === src.id),
      );
      if (dup) {
        toast("이미 연결된 포트 쌍입니다.", "error");
        return;
      }
      const r = await createConnection({
        projectId: full.project.id,
        sourcePortId: src.id,
        targetPortId: tgt.id,
      });
      if (r.ok) {
        toast("Assembly 커넥터가 생성되었습니다.");
        router.refresh();
      } else {
        toast(r.error, "error");
      }
    },
    [portLookup, full, router, toast],
  );

  return (
    <div className="xy-theme relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.6}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{ type: "smoothstep" }}
        connectionRadius={28}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1.4}
          color="#1c2637"
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          className="!h-[110px] !w-[168px] !rounded-lg !border !border-line"
          nodeColor="#232e42"
        />
      </ReactFlow>

      {/* 범례 / 안내 오버레이 */}
      <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-2">
        <div className="panel pointer-events-auto px-3.5 py-2.5 text-[11px]">
          <div className="mb-1.5 font-mono text-[9px] tracking-[0.22em] text-fog uppercase">
            Assembly Editor
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-mist">
              <span className="h-2 w-2 rounded-full bg-mint" />
              P-Port (제공)
            </span>
            <span className="flex items-center gap-1.5 text-mist">
              <span className="h-2 w-2 rounded-full bg-amberx" />
              R-Port (요구)
            </span>
            <span className="flex items-center gap-1.5 text-mist">
              <span className="h-px w-5 bg-accent" />
              S/R
            </span>
            <span className="flex items-center gap-1.5 text-mist">
              <span className="h-px w-5 bg-violet" />
              C/S
            </span>
          </div>
        </div>
        <div className="panel pointer-events-auto flex items-center gap-2 px-3.5 py-2 font-mono text-[9.5px] leading-relaxed text-fog">
          <span>
            포트 핸들 드래그 → 연결 · Delete → 선택 삭제
          </span>
          <button
            onClick={autoLayout}
            className="ml-1 flex cursor-pointer items-center gap-1.5 rounded-md border border-line-bright bg-ink-800 px-2.5 py-1.5 text-[10px] font-medium text-mist transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Wand2 className="h-3 w-3" />
            자동 정렬
          </button>
        </div>
      </div>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="panel px-8 py-6 text-center">
            <div className="font-display text-sm font-semibold text-mist">
              캔버스가 비어 있습니다
            </div>
            <p className="mt-1 text-xs text-fog">
              SW 컴포넌트 탭에서 SWC를 먼저 생성하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
