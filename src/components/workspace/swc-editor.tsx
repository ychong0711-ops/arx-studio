"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Modal,
  Segmented,
  Select,
  useToast,
} from "@/components/ui";
import { upsertSwc } from "@/lib/actions";
import type { InterfaceRow, PortRow, RunnableRow, SwcRow } from "@/db/schema";
import { SWC_CATEGORIES } from "@/lib/types";

export interface PortDraft {
  id?: string;
  name: string;
  direction: "provided" | "required";
  interfaceId: string | null;
  queued: boolean;
}

export interface RunnableDraft {
  id?: string;
  name: string;
  eventType: string;
  periodMs: number;
  operationPort: string;
}

export function SwcEditor({
  open,
  onClose,
  projectId,
  swc,
  interfaces,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  swc: (SwcRow & { ports: PortRow[]; runnables: RunnableRow[] }) | null;
  interfaces: InterfaceRow[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(swc?.name ?? "");
  const [category, setCategory] = useState(swc?.category ?? "application");
  const [description, setDescription] = useState(swc?.description ?? "");
  const [portsV, setPorts] = useState<PortDraft[]>(
    swc?.ports.map((p) => ({
      id: p.id,
      name: p.name,
      direction: p.direction as "provided" | "required",
      interfaceId: p.interfaceId,
      queued: p.queued,
    })) ?? [],
  );
  const [runs, setRuns] = useState<RunnableDraft[]>(
    swc?.runnables.map((r) => ({
      id: r.id,
      name: r.name,
      eventType: r.eventType,
      periodMs: r.periodMs,
      operationPort: r.operationPort,
    })) ?? [],
  );

  const patchPort = (i: number, patch: Partial<PortDraft>) =>
    setPorts((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const patchRun = (i: number, patch: Partial<RunnableDraft>) =>
    setRuns((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const providedIfaces = (direction: string) =>
    interfaces; // AUTOSAR상 kind 제한 없이 자유롭게 타입 지정 가능

  const submit = async () => {
    setBusy(true);
    try {
      const r = await upsertSwc({
        id: swc?.id,
        projectId,
        name: name.trim(),
        category,
        description,
        ports: portsV.filter((p) => p.name.trim()),
        runnables: runs.filter((r) => r.name.trim()),
      });
      if (r.ok) {
        toast(swc ? "SWC가 저장되었습니다." : "SWC가 생성되었습니다.");
        onClose();
        router.refresh();
      } else {
        toast(r.error, "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={swc ? `SWC 편집` : "새 SW 컴포넌트"}
      sub="PORTS · INTERNAL-BEHAVIOR · RUNNABLE-ENTITY"
      width="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button loading={busy} onClick={submit}>
            <Save className="h-4 w-4" />
            {swc ? "변경 저장" : "SWC 생성"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="SHORT-NAME">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-mono"
            placeholder="예: WiperCtrl"
            autoFocus
          />
        </Field>
        <Field label="카테고리">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {SWC_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="설명">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="컴포넌트 역할 요약"
          />
        </Field>
      </div>

      {/* ── PORTS ── */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold text-snow">
            Ports{" "}
            <span className="ml-1 font-mono text-[10px] text-fog">
              P-PORT-PROTOTYPE / R-PORT-PROTOTYPE
            </span>
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setPorts((ps) => [
                ...ps,
                {
                  name: `${ps.length % 2 === 0 ? "P" : "R"}_Port${ps.length + 1}`,
                  direction: "provided",
                  interfaceId: interfaces[0]?.id ?? null,
                  queued: false,
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            포트 추가
          </Button>
        </div>
        {portsV.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-bright px-4 py-4 text-center text-xs text-fog">
            포트가 없습니다. 포트를 추가해 다른 SWC와 통신할 수 있습니다.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_150px_1fr_64px_32px] items-center gap-2 px-1 font-mono text-[9px] tracking-[0.16em] text-fog uppercase">
              <span>포트명</span>
              <span>방향</span>
              <span>인터페이스</span>
              <span>Queued</span>
              <span />
            </div>
            {portsV.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_150px_1fr_64px_32px] items-center gap-2 rounded-lg border border-line bg-ink-900/50 p-2"
              >
                <Input
                  value={p.name}
                  onChange={(e) => patchPort(i, { name: e.target.value })}
                  className="h-8 font-mono text-xs"
                  placeholder="PortName"
                />
                <Segmented
                  size="sm"
                  value={p.direction}
                  onChange={(v) =>
                    patchPort(i, { direction: v as "provided" | "required" })
                  }
                  options={[
                    { value: "provided", label: "P (제공)" },
                    { value: "required", label: "R (요구)" },
                  ]}
                />
                <Select
                  value={p.interfaceId ?? ""}
                  onChange={(e) =>
                    patchPort(i, { interfaceId: e.target.value || null })
                  }
                  className="h-8 text-xs"
                >
                  <option value="">(인터페이스 없음)</option>
                  {providedIfaces(p.direction).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={p.queued}
                    onChange={(e) => patchPort(i, { queued: e.target.checked })}
                    className="h-4 w-4 cursor-pointer accent-[#2ecdf7]"
                    title="S/R Queued 통신"
                  />
                </div>
                <button
                  onClick={() => setPorts((ps) => ps.filter((_, x) => x !== i))}
                  className="cursor-pointer rounded p-1 text-fog transition-colors hover:text-rose"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RUNNABLES ── */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold text-snow">
            Runnables{" "}
            <span className="ml-1 font-mono text-[10px] text-fog">
              RUNNABLE-ENTITY + RTE EVENT
            </span>
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setRuns((rs) => [
                ...rs,
                {
                  name: `${name || "Swc"}_${rs.length === 0 ? "Init" : "Run" + rs.length}`,
                  eventType: rs.length === 0 ? "init" : "timing",
                  periodMs: 10,
                  operationPort: "",
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Runnable 추가
          </Button>
        </div>
        {runs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-bright px-4 py-4 text-center text-xs text-fog">
            Runnable이 없습니다. 최소 Init + 주기 Runnable 조합을 권장합니다.
          </p>
        ) : (
          <div className="space-y-2">
            {runs.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_170px_110px_1fr_32px] items-center gap-2 rounded-lg border border-line bg-ink-900/50 p-2"
              >
                <Input
                  value={r.name}
                  onChange={(e) => patchRun(i, { name: e.target.value })}
                  className="h-8 font-mono text-xs"
                />
                <Select
                  value={r.eventType}
                  onChange={(e) => patchRun(i, { eventType: e.target.value })}
                  className="h-8 text-xs"
                >
                  <option value="init">Init Event</option>
                  <option value="timing">Timing Event</option>
                  <option value="operation-invoked">Operation Invoked</option>
                </Select>
                {r.eventType === "timing" ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      value={r.periodMs}
                      onChange={(e) =>
                        patchRun(i, { periodMs: Number(e.target.value) })
                      }
                      className="h-8 font-mono text-xs"
                    />
                    <span className="font-mono text-[10px] text-fog">ms</span>
                  </div>
                ) : r.eventType === "operation-invoked" ? (
                  <Select
                    value={r.operationPort}
                    onChange={(e) =>
                      patchRun(i, { operationPort: e.target.value })
                    }
                    className="h-8 text-xs"
                  >
                    <option value="">(P-Port 선택)</option>
                    {portsV
                      .filter((x) => x.direction === "provided")
                      .map((x, xid) => (
                        <option key={xid} value={x.name}>
                          {x.name}
                        </option>
                      ))}
                  </Select>
                ) : (
                  <div className="text-center font-mono text-[10px] text-fog/50">
                    —
                  </div>
                )}
                <div />
                <button
                  onClick={() => setRuns((rs) => rs.filter((_, x) => x !== i))}
                  className="cursor-pointer rounded p-1 text-fog transition-colors hover:text-rose"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
