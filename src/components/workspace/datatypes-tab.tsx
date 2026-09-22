"use client";

import { motion } from "framer-motion";
import { Braces, Pencil, Plus, Trash2 } from "lucide-react";
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
  Select,
  useToast,
} from "@/components/ui";
import type { DataTypeRow } from "@/db/schema";
import { deleteDataType, upsertDataType } from "@/lib/actions";
import { BASE_TYPES, type FullProject } from "@/lib/types";

export function DataTypesTab({ full }: { full: FullProject }) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<DataTypeRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<DataTypeRow | null>(null);

  useEffect(() => {
    const onNew = () => setEditing("new");
    window.addEventListener("arx:new-dt", onNew);
    return () => window.removeEventListener("arx:new-dt", onNew);
  }, []);

  const usedBy = (name: string) => {
    let n = 0;
    for (const f of full.interfaces) {
      for (const el of (f.elements ?? []) as { typeRef?: string; args?: { typeRef: string }[] }[]) {
        if (el.typeRef === name) n++;
        if (el.args) n += el.args.filter((a) => a.typeRef === name).length;
      }
    }
    return n;
  };

  return (
    <div className="px-7 py-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-fog">
          APPLICATION-PRIMITIVE-DATA-TYPE과 함께 Implementation 타입, 물리
          제약(DATA-CONSTR)이 자동 생성됩니다.
        </p>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" />새 데이터 타입
        </Button>
      </div>

      {full.dataTypes.length === 0 ? (
        <EmptyState
          icon={<Braces className="h-5 w-5" />}
          title="데이터 타입이 없습니다"
          desc="인터페이스 데이터 요소가 참조할 Application 데이터 타입을 정의하세요."
          action={
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="h-3.5 w-3.5" />첫 타입 만들기
            </Button>
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel overflow-hidden"
        >
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line font-mono text-[9.5px] tracking-[0.18em] text-fog uppercase">
                <th className="px-5 py-3 font-medium">SHORT-NAME</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Base Type</th>
                <th className="px-4 py-3 font-medium">물리 범위</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">참조</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {full.dataTypes.map((dt) => (
                <tr
                  key={dt.id}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-ink-800/50"
                >
                  <td className="px-5 py-3">
                    <span className="font-mono text-[12.5px] font-semibold text-accent">
                      {dt.name}
                    </span>
                    <span className="ml-2 font-mono text-[9.5px] text-fog/60">
                      → {dt.name}_Impl
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Chip color={dt.category === "BOOLEAN" ? "violet" : "gray"}>
                      {dt.category}
                    </Chip>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-mist">
                    {dt.baseType}
                    {dt.category === "ARRAY" && (
                      <span className="ml-2 text-[9.5px] text-accent/70">
                        {dt.elementType}[{dt.maxSize || "?"}]
                      </span>
                    )}
                    {dt.category === "STRUCTURE" && (
                      <span className="ml-2 text-[9.5px] text-violet/70">
                        ({(dt.elements ?? []).length} fields)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fog">
                    [{dt.lowerLimit} .. {dt.upperLimit}]
                  </td>
                  <td className="px-4 py-3 text-xs text-mist">
                    {dt.unit || <span className="text-fog/50">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-fog">
                    {usedBy(dt.name)} refs
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton title="편집" onClick={() => setEditing(dt)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        title="삭제"
                        className="hover:text-rose"
                        onClick={() => setDeleting(dt)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {editing !== null && (
        <DataTypeEditor
          key={editing === "new" ? "new" : editing.id}
          dt={editing === "new" ? null : editing}
          projectId={full.project.id}
          dataTypes={full.dataTypes.map((d) => d.name)}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="데이터 타입 삭제"
        message={
          <>
            <b className="font-mono text-snow">{deleting?.name}</b>을(를)
            참조하는 인터페이스 요소가 있으면 ARXML 생성 시 오류로 표시됩니다.
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          await deleteDataType(deleting.id, full.project.id);
          toast("데이터 타입이 삭제되었습니다.");
          router.refresh();
        }}
      />
    </div>
  );
}

function DataTypeEditor({
  dt,
  projectId,
  dataTypes,
  onClose,
}: {
  dt: DataTypeRow | null;
  projectId: string;
  dataTypes: string[];
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: dt?.name ?? "",
    category: dt?.category ?? "VALUE",
    baseType: dt?.baseType ?? "uint16",
    lowerLimit: dt?.lowerLimit ?? "0",
    upperLimit: dt?.upperLimit ?? "65535",
    unit: dt?.unit ?? "",
    elementType: dt?.elementType ?? "",
    maxSize: dt?.maxSize ?? 0,
    elements: (dt?.elements ?? []) as { name: string; typeRef: string }[],
  });
  const set =
    (
      k:
        | "name"
        | "category"
        | "baseType"
        | "lowerLimit"
        | "upperLimit"
        | "unit"
        | "elementType",
    ) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const setMaxSize = (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, maxSize: parseInt(e.target.value, 10) || 0 }));
  const setMember = (i: number, patch: { name?: string; typeRef?: string }) =>
    setForm((f) => ({
      ...f,
      elements: f.elements.map((m, mi) => (mi === i ? { ...m, ...patch } : m)),
    }));
  const removeMember = (i: number) =>
    setForm((f) => ({
      ...f,
      elements: f.elements.filter((_, mi) => mi !== i),
    }));
  const addMember = () =>
    setForm((f) => ({
      ...f,
      elements: [
        ...f.elements,
        { name: `name${f.elements.length + 1}`, typeRef: dataTypes[0] ?? "" },
      ],
    }));
  const typeOptions = (current: string) => (
    <>
      <option value="">— 선택 —</option>
      {current !== "" && !dataTypes.includes(current) && (
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
      const r = await upsertDataType({
        id: dt?.id,
        projectId,
        name: form.name.trim(),
        category: form.category,
        baseType: form.baseType,
        lowerLimit: form.lowerLimit,
        upperLimit: form.upperLimit,
        unit: form.unit.trim(),
        elementType: form.elementType,
        maxSize: form.maxSize,
        elements: form.elements.filter((m) => m.name.trim() && m.typeRef),
      });
      if (r.ok) {
        toast("데이터 타입이 저장되었습니다.");
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
      title={dt ? "데이터 타입 편집" : "새 데이터 타입"}
      sub="APPLICATION-PRIMITIVE-DATA-TYPE"
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
            value={form.name}
            onChange={set("name")}
            className="font-mono"
            placeholder="예: VehicleSpeed_T"
            autoFocus
          />
        </Field>
        <Field label="카테고리">
          <Select value={form.category} onChange={set("category")}>
            <option value="VALUE">VALUE (수치)</option>
            <option value="BOOLEAN">BOOLEAN</option>
            <option value="ARRAY">ARRAY (배열)</option>
            <option value="STRUCTURE">STRUCTURE (구조체)</option>
          </Select>
        </Field>
        <Field label="Base Type" hint="SW-BASE-TYPE">
          <Select value={form.baseType} onChange={set("baseType")}>
            {BASE_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="단위 (Unit)" hint="optional">
          <Input
            value={form.unit}
            onChange={set("unit")}
            className="font-mono"
            placeholder="예: KmPerHour"
          />
        </Field>
        <Field label="하한 (Lower Limit)">
          <Input
            value={form.lowerLimit}
            onChange={set("lowerLimit")}
            className="font-mono"
          />
        </Field>
        <Field label="상한 (Upper Limit)">
          <Input
            value={form.upperLimit}
            onChange={set("upperLimit")}
            className="font-mono"
          />
        </Field>
        {form.category === "ARRAY" && (
          <>
            <Field label="요소 타입 (Element Type)" hint="ARRAY 요소">
              <Select
                value={form.elementType}
                onChange={set("elementType")}
                className="font-mono"
              >
                {typeOptions(form.elementType)}
              </Select>
            </Field>
            <Field label="최대 요소 수 (Max Size)" hint="min 1">
              <Input
                type="number"
                min={1}
                step={1}
                value={form.maxSize}
                onChange={setMaxSize}
                className="font-mono"
              />
            </Field>
          </>
        )}
      </div>

      {form.category === "STRUCTURE" && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-snow">
              멤버{" "}
              <span className="font-mono text-[10px] text-fog">
                RECORD-ELEMENT · {form.elements.length}개
              </span>
            </h4>
            <Button size="sm" variant="outline" onClick={addMember}>
              <Plus className="h-3.5 w-3.5" />
              멤버 추가
            </Button>
          </div>
          <div className="space-y-2">
            {form.elements.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2">
                <Input
                  value={m.name}
                  className="h-8 font-mono text-xs"
                  placeholder={`name-${i}`}
                  onChange={(e) => setMember(i, { name: e.target.value })}
                />
                <Select
                  value={m.typeRef}
                  className="h-8 font-mono text-xs"
                  onChange={(e) => setMember(i, { typeRef: e.target.value })}
                >
                  {typeOptions(m.typeRef)}
                </Select>
                <button
                  onClick={() => removeMember(i)}
                  className="cursor-pointer rounded p-1 text-fog hover:text-rose"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {form.elements.length === 0 && (
              <p className="rounded-lg border border-dashed border-line-bright px-4 py-4 text-center text-xs text-fog">
                멤버를 추가하세요.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
