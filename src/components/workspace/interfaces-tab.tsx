"use client";

import { motion } from "framer-motion";
import { ArrowLeftRight, ArrowRightLeft, Pencil, Plus, Trash2, Waypoints } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  ConfirmModal,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Segmented,
  Select,
  useToast,
} from "@/components/ui";
import type { InterfaceRow } from "@/db/schema";
import { deleteInterface, upsertInterface } from "@/lib/actions";
import {
  csOperations,
  srElements,
  type CsArgument,
  type CsOperation,
  type FullProject,
  type SrElement,
} from "@/lib/types";

export function InterfacesTab({ full }: { full: FullProject }) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<InterfaceRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<InterfaceRow | null>(null);

  useEffect(() => {
    const onNew = () => setEditing("new");
    window.addEventListener("arx:new-iface", onNew);
    return () => window.removeEventListener("arx:new-iface", onNew);
  }, []);

  const groups = [
    { kind: "sender-receiver", label: "SENDER-RECEIVER", icon: ArrowRightLeft, color: "cyan" as const },
    { kind: "client-server", label: "CLIENT-SERVER", icon: ArrowLeftRight, color: "violet" as const },
  ];

  return (
    <div className="px-7 py-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-fog">
          포트 간 통신 계약을 정의합니다. S/R은 데이터 흐름, C/S는 원격 연산
          호출입니다.
        </p>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" />새 인터페이스
        </Button>
      </div>

      {full.interfaces.length === 0 ? (
        <EmptyState
          icon={<Waypoints className="h-5 w-5" />}
          title="인터페이스가 없습니다"
          desc="Sender-Receiver 인터페이스로 센서 데이터 흐름부터 정의해 보세요."
          action={
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="h-3.5 w-3.5" />첫 인터페이스 만들기
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {groups.map((g) => (
            <div key={g.kind}>
              <div className="mb-3 flex items-center gap-2">
                <g.icon className="h-4 w-4 text-fog" strokeWidth={1.7} />
                <span className="font-mono text-[10px] tracking-[0.22em] text-fog">
                  {g.label}
                </span>
                <Chip color="gray">
                  {full.interfaces.filter((f) => f.kind === g.kind).length}
                </Chip>
              </div>
              <div className="space-y-3">
                {full.interfaces
                  .filter((f) => f.kind === g.kind)
                  .map((iface, i) => (
                    <motion.div
                      key={iface.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="panel panel-hover p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-semibold text-snow">
                            {iface.name}
                          </span>
                          <Chip color={g.color}>
                            {g.kind === "sender-receiver" ? "S/R" : "C/S"}
                          </Chip>
                        </div>
                        <div className="flex gap-1">
                          <IconButton title="편집" onClick={() => setEditing(iface)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            title="삭제"
                            className="hover:text-rose"
                            onClick={() => setDeleting(iface)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 rounded-lg border border-line bg-ink-900/60 px-3 py-2.5 font-mono text-[10.5px]">
                        {iface.kind === "sender-receiver" ? (
                          srElements(iface).length === 0 ? (
                            <div className="text-fog/50">데이터 요소 없음</div>
                          ) : (
                            srElements(iface).map((el, x) => (
                              <div key={x} className="flex gap-2">
                                <span className="text-accent">{el.typeRef}</span>
                                <span className="text-mist">{el.name}</span>
                              </div>
                            ))
                          )
                        ) : csOperations(iface).length === 0 ? (
                          <div className="text-fog/50">연산 없음</div>
                        ) : (
                          csOperations(iface).map((op, x) => (
                            <div key={x}>
                              <span className="text-violet">{op.name}</span>
                              <span className="text-fog">(</span>
                              <span className="text-mist">
                                {op.args
                                  .map(
                                    (a) =>
                                      `${a.direction} ${a.typeRef} ${a.name}`,
                                  )
                                  .join(", ")}
                              </span>
                              <span className="text-fog">)</span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  ))}
                {full.interfaces.filter((f) => f.kind === g.kind).length === 0 && (
                  <div className="rounded-lg border border-dashed border-line-bright px-4 py-6 text-center text-xs text-fog/60">
                    해당 종류의 인터페이스가 없습니다
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <InterfaceEditor
          key={editing === "new" ? "new" : editing.id}
          iface={editing === "new" ? null : editing}
          projectId={full.project.id}
          dataTypes={full.dataTypes.map((d) => d.name)}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="인터페이스 삭제"
        message={
          <>
            <b className="font-mono text-snow">{deleting?.name}</b>을(를)
            삭제하면 이를 참조하는 포트의 타입 지정이 해제됩니다.
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          await deleteInterface(deleting.id, full.project.id);
          toast("인터페이스가 삭제되었습니다.");
          router.refresh();
        }}
      />
    </div>
  );
}

/* ── 인터페이스 에디터 ───────────────────────────── */
function InterfaceEditor({
  iface,
  projectId,
  dataTypes,
  onClose,
}: {
  iface: InterfaceRow | null;
  projectId: string;
  dataTypes: string[];
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(iface?.name ?? "");
  const [kind, setKind] = useState(
    (iface?.kind as "sender-receiver" | "client-server") ?? "sender-receiver",
  );
  const [sr, setSr] = useState<SrElement[]>(
    iface?.kind === "sender-receiver" ? srElements(iface) : [],
  );
  const [cs, setCs] = useState<CsOperation[]>(
    iface?.kind === "client-server" ? csOperations(iface) : [],
  );

  const typeOptions = (current: string) => (
    <>
      {current && !dataTypes.includes(current) && (
        <option value={current}>{current} (미정의)</option>
      )}
      {dataTypes.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </>
  );

  const submit = async () => {
    setBusy(true);
    try {
      const r = await upsertInterface({
        id: iface?.id,
        projectId,
        name: name.trim(),
        kind,
        elements: (kind === "sender-receiver"
          ? sr.filter((e) => e.name.trim() && e.typeRef)
          : cs.filter((o) => o.name.trim())) as SrElement[] | CsOperation[],
      });
      if (r.ok) {
        toast("인터페이스가 저장되었습니다.");
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
      open
      onClose={onClose}
      title={iface ? "인터페이스 편집" : "새 인터페이스"}
      sub={
        kind === "sender-receiver"
          ? "SENDER-RECEIVER-INTERFACE · DATA-ELEMENTS"
          : "CLIENT-SERVER-INTERFACE · OPERATIONS"
      }
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button loading={busy} onClick={submit}>
            저장
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SHORT-NAME">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-mono"
            placeholder="예: VehicleSpeed_If"
            autoFocus
          />
        </Field>
        <Field label="종류">
          <Segmented
            value={kind}
            onChange={(v) => setKind(v as typeof kind)}
            options={[
              { value: "sender-receiver", label: "Sender-Receiver" },
              { value: "client-server", label: "Client-Server" },
            ]}
          />
        </Field>
      </div>

      {kind === "sender-receiver" ? (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-snow">
              데이터 요소{" "}
              <span className="font-mono text-[10px] text-fog">
                VARIABLE-DATA-PROTOTYPE
              </span>
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setSr((s) => [
                  ...s,
                  { name: `data${s.length + 1}`, typeRef: dataTypes[0] ?? "" },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              요소 추가
            </Button>
          </div>
          <div className="space-y-2">
            {sr.map((el, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2">
                <Input
                  value={el.name}
                  className="h-8 font-mono text-xs"
                  placeholder="요소명"
                  onChange={(e) =>
                    setSr((s) =>
                      s.map((x, xi) =>
                        xi === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Select
                  value={el.typeRef}
                  className="h-8 font-mono text-xs"
                  onChange={(e) =>
                    setSr((s) =>
                      s.map((x, xi) =>
                        xi === i ? { ...x, typeRef: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {typeOptions(el.typeRef)}
                </Select>
                <button
                  onClick={() => setSr((s) => s.filter((_, xi) => xi !== i))}
                  className="cursor-pointer rounded p-1 text-fog hover:text-rose"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {sr.length === 0 && (
              <p className="rounded-lg border border-dashed border-line-bright px-4 py-4 text-center text-xs text-fog">
                데이터 요소를 추가하세요.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-snow">
              연산{" "}
              <span className="font-mono text-[10px] text-fog">
                CLIENT-SERVER-OPERATION
              </span>
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCs((c) => [...c, { name: `Operation${c.length + 1}`, args: [] }])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              연산 추가
            </Button>
          </div>
          <div className="space-y-3">
            {cs.map((op, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-ink-900/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={op.name}
                    className="h-8 font-mono text-xs"
                    onChange={(e) =>
                      setCs((c) =>
                        c.map((x, xi) =>
                          xi === i ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCs((c) =>
                        c.map((x, xi) =>
                          xi === i
                            ? {
                                ...x,
                                args: [
                                  ...x.args,
                                  {
                                    name: `arg${x.args.length + 1}`,
                                    direction: "IN" as CsArgument["direction"],
                                    typeRef: dataTypes[0] ?? "",
                                  },
                                ],
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <Plus className="h-3 w-3" />
                    인자
                  </Button>
                  <button
                    onClick={() => setCs((c) => c.filter((_, xi) => xi !== i))}
                    className="cursor-pointer rounded p-1 text-fog hover:text-rose"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {op.args.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-l-2 border-violet/30 pl-3">
                    {op.args.map((a, ai) => (
                      <div
                        key={ai}
                        className="grid grid-cols-[90px_1fr_1fr_28px] items-center gap-2"
                      >
                        <Select
                          value={a.direction}
                          className="h-7 font-mono text-[10px]"
                          onChange={(e) =>
                            setCs((c) =>
                              c.map((x, xi) =>
                                xi === i
                                  ? {
                                      ...x,
                                      args: x.args.map((y, yi) =>
                                        yi === ai
                                          ? {
                                              ...y,
                                              direction: e.target
                                                .value as CsArgument["direction"],
                                            }
                                          : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          {["IN", "OUT", "INOUT"].map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </Select>
                        <Select
                          value={a.typeRef}
                          className="h-7 font-mono text-[10px]"
                          onChange={(e) =>
                            setCs((c) =>
                              c.map((x, xi) =>
                                xi === i
                                  ? {
                                      ...x,
                                      args: x.args.map((y, yi) =>
                                        yi === ai
                                          ? { ...y, typeRef: e.target.value }
                                          : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          {typeOptions(a.typeRef)}
                        </Select>
                        <Input
                          value={a.name}
                          className="h-7 font-mono text-[10px]"
                          onChange={(e) =>
                            setCs((c) =>
                              c.map((x, xi) =>
                                xi === i
                                  ? {
                                      ...x,
                                      args: x.args.map((y, yi) =>
                                        yi === ai
                                          ? { ...y, name: e.target.value }
                                          : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        <button
                          onClick={() =>
                            setCs((c) =>
                              c.map((x, xi) =>
                                xi === i
                                  ? {
                                      ...x,
                                      args: x.args.filter((_, yi) => yi !== ai),
                                    }
                                  : x,
                              ),
                            )
                          }
                          className="cursor-pointer rounded p-1 text-fog hover:text-rose"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cs.length === 0 && (
              <p className="rounded-lg border border-dashed border-line-bright px-4 py-4 text-center text-xs text-fog">
                연산을 추가하세요.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
