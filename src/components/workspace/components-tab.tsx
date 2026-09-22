"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  LayoutTemplate,
  Pencil,
  PlayCircle,
  Plus,
  Timer,
  Trash2,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Chip,
  ConfirmModal,
  EmptyState,
  IconButton,
  useToast,
} from "@/components/ui";
import { SwcEditor } from "@/components/workspace/swc-editor";
import type { PortRow, RunnableRow, SwcRow } from "@/db/schema";
import { deleteSwc, upsertSwc } from "@/lib/actions";
import { SWC_TEMPLATES, type SwcTemplate } from "@/lib/templates";
import { SWC_CATEGORIES, type FullProject } from "@/lib/types";

type FullSwc = SwcRow & { ports: PortRow[]; runnables: RunnableRow[] };

const EVENT_META: Record<string, { label: string; icon: typeof Timer }> = {
  init: { label: "INIT", icon: Zap },
  timing: { label: "TIMING", icon: Timer },
  "operation-invoked": { label: "OP-INVOKED", icon: PlayCircle },
};

export function ComponentsTab({ full }: { full: FullProject }) {
  const toast = useToast();
  const router = useRouter();
  const [editor, setEditor] = useState<{ open: boolean; swc: FullSwc | null }>({
    open: false,
    swc: null,
  });
  const [deleting, setDeleting] = useState<FullSwc | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const tplRef = useRef<HTMLDivElement>(null);

  // 커맨드 팔레트 이벤트
  useEffect(() => {
    const onNew = () => setEditor({ open: true, swc: null });
    const onEdit = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      const swc = full.components.find((c) => c.id === id);
      if (swc) setEditor({ open: true, swc });
    };
    window.addEventListener("arx:new-swc", onNew);
    window.addEventListener("arx:edit-swc", onEdit);
    return () => {
      window.removeEventListener("arx:new-swc", onNew);
      window.removeEventListener("arx:edit-swc", onEdit);
    };
  }, [full.components]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (tplRef.current && !tplRef.current.contains(e.target as Node)) {
        setTplOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const addFromTemplate = async (tpl: SwcTemplate) => {
    setTplOpen(false);
    // 이름 충돌 회피
    let name = tpl.name;
    let n = 2;
    const names = new Set(full.components.map((c) => c.name));
    while (names.has(name)) name = `${tpl.name}${n++}`;

    const r = await upsertSwc({
      projectId: full.project.id,
      name,
      category: tpl.category,
      description: tpl.description,
      ports: tpl.ports.map((p) => ({
        name: p.name,
        direction: p.direction,
        interfaceId:
          full.interfaces.find((f) => f.name === p.ifaceHint)?.id ?? null,
        queued: false,
      })),
      runnables: tpl.runnables.map((x) => ({
        ...x,
        name: x.name.replace(tpl.name, name),
        operationPort: "",
      })),
    });
    if (r.ok) {
      toast(`템플릿 '${name}'이(가) 추가되었습니다.`);
      router.refresh();
    } else {
      toast(r.error, "error");
    }
  };

  return (
    <div className="px-7 py-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-fog">
          SW-COMPONENT-TYPE을 정의하고 포트·Runnable을 구성합니다.{" "}
          <span className="font-mono">{full.components.length}</span>개
          컴포넌트
        </p>
        <div className="flex gap-2">
          <div className="relative" ref={tplRef}>
            <Button size="sm" variant="outline" onClick={() => setTplOpen((o) => !o)}>
              <LayoutTemplate className="h-3.5 w-3.5" />
              템플릿
            </Button>
            <AnimatePresence>
              {tplOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className="panel absolute top-full right-0 z-40 mt-2 w-[320px] overflow-hidden shadow-panel"
                >
                  <div className="border-b border-line px-4 py-2.5 font-mono text-[9.5px] tracking-[0.2em] text-fog uppercase">
                    도메인 템플릿 · 원클릭 추가
                  </div>
                  <div className="max-h-[340px] overflow-y-auto p-1.5">
                    {SWC_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.name}
                        onClick={() => void addFromTemplate(tpl)}
                        className="group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-ink-700"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] font-semibold text-mist group-hover:text-snow">
                              {tpl.name}
                            </span>
                            <Chip color="cyan">{tpl.domain}</Chip>
                          </div>
                          <div className="mt-1 text-[11px] leading-snug text-fog">
                            {tpl.description}
                          </div>
                          <div className="mt-1 font-mono text-[9px] text-fog/60">
                            {tpl.ports.length} PORT · {tpl.runnables.length} RUN
                          </div>
                        </div>
                        <Plus className="mt-1 h-3.5 w-3.5 shrink-0 text-fog transition-colors group-hover:text-accent" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            size="sm"
            onClick={() => setEditor({ open: true, swc: null })}
          >
            <Plus className="h-3.5 w-3.5" />새 SWC
          </Button>
        </div>
      </div>

      {full.components.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-5 w-5" />}
          title="SWC가 없습니다"
          desc="Application SWC부터 만들어 보세요. 센서/액추에이터 SWC로 입출력을 구성할 수 있습니다."
          action={
            <Button size="sm" onClick={() => setEditor({ open: true, swc: null })}>
              <Plus className="h-3.5 w-3.5" />첫 SWC 만들기
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {full.components.map((swc, i) => {
            const cat = SWC_CATEGORIES.find((c) => c.value === swc.category);
            const pPorts = swc.ports.filter((p) => p.direction === "provided");
            const rPorts = swc.ports.filter((p) => p.direction === "required");
            return (
              <motion.div
                key={swc.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="panel panel-hover flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="truncate font-display text-base font-semibold tracking-tight text-snow">
                        {swc.name}
                      </h3>
                      <Chip color="cyan">{cat?.arxmlTag.split("-SW-COMPONENT")[0] ?? swc.category}</Chip>
                    </div>
                    {swc.description && (
                      <p className="mt-1.5 line-clamp-1 text-xs text-fog">
                        {swc.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton
                      title="편집"
                      onClick={() => setEditor({ open: true, swc })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      title="삭제"
                      className="hover:text-rose"
                      onClick={() => setDeleting(swc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>

                {/* 포트 */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {swc.ports.length === 0 && (
                    <span className="text-[11px] text-fog/60">
                      정의된 포트 없음
                    </span>
                  )}
                  {pPorts.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-mint/30 bg-mint/8 px-2 py-1 font-mono text-[10px] text-mint"
                    >
                      <ArrowUpFromLine className="h-3 w-3" />
                      {p.name}
                      <span className="text-mint/50">
                        {full.interfaces.find((f) => f.id === p.interfaceId)
                          ?.name ?? "—"}
                      </span>
                    </span>
                  ))}
                  {rPorts.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amberx/30 bg-amberx/8 px-2 py-1 font-mono text-[10px] text-amberx"
                    >
                      <ArrowDownToLine className="h-3 w-3" />
                      {p.name}
                      <span className="text-amberx/50">
                        {full.interfaces.find((f) => f.id === p.interfaceId)
                          ?.name ?? "—"}
                      </span>
                    </span>
                  ))}
                </div>

                {/* Runnable */}
                {swc.runnables.length > 0 && (
                  <div className="mt-4 space-y-1 border-t border-line pt-3.5">
                    {swc.runnables.map((r) => {
                      const meta = EVENT_META[r.eventType] ?? EVENT_META.timing;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-2 font-mono text-[10.5px] text-fog"
                        >
                          <meta.icon className="h-3 w-3 text-accent/70" />
                          <span className="text-mist">{r.name}</span>
                          <span className="text-fog/50">
                            {meta.label}
                            {r.eventType === "timing" ? ` · ${r.periodMs}ms` : ""}
                            {r.eventType === "operation-invoked" && r.operationPort
                              ? ` · ${r.operationPort}`
                              : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {editor.open && (
        <SwcEditor
          key={editor.swc?.id ?? "new"}
          open={editor.open}
          onClose={() => setEditor({ open: false, swc: null })}
          projectId={full.project.id}
          swc={editor.swc}
          interfaces={full.interfaces}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="SWC 삭제"
        message={
          <>
            <b className="font-mono text-snow">{deleting?.name}</b>과 연결된 포트,
            Runnable, 커넥터가 함께 삭제됩니다.
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          await deleteSwc(deleting.id, full.project.id);
          toast("SWC가 삭제되었습니다.");
          router.refresh();
        }}
      />
    </div>
  );
}
