"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Braces,
  CircleDot,
  Copy,
  Cpu,
  Database,
  FileUp,
  FolderPlus,
  Hexagon,
  Plug2,
  Sparkles,
  Trash2,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  Button,
  Chip,
  ConfirmModal,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  createDemoProject,
  createProject,
  deleteProject,
  duplicateProject,
  importProject,
} from "@/lib/actions";
import { parseArxml, type ImportPayload } from "@/lib/importer";
import type { ProjectSummary } from "@/lib/queries";

function timeAgo(d: Date | string): string {
  const t = new Date(d).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/* ── 로고 마크 ───────────────────────────────────── */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Hexagon
        className="absolute text-accent"
        style={{ width: size, height: size }}
        strokeWidth={1.4}
      />
      <CircleDot
        className="text-accent"
        style={{ width: size * 0.36, height: size * 0.36 }}
        strokeWidth={2.4}
      />
    </div>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-[15px] font-bold tracking-[0.18em] text-snow">
          ARX<span className="text-accent">STUDIO</span>
        </div>
        <div className="mt-1 font-mono text-[9px] tracking-[0.3em] text-fog uppercase">
          Autosar Authoring
        </div>
      </div>
    </div>
  );
}

/* ── 대시보드 ────────────────────────────────────── */
export function Dashboard({ summaries }: { summaries: ProjectSummary[] }) {
  const router = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [pending, startTransition] = useTransition();

  const doDuplicate = (id: string) =>
    startTransition(async () => {
      const r = await duplicateProject(id);
      if (r.ok) {
        toast("프로젝트가 복제되었습니다.");
        router.refresh();
      } else {
        toast(r.error, "error");
      }
    });

  const totals = summaries.reduce(
    (acc, s) => ({
      swc: acc.swc + s.swcCount,
      iface: acc.iface + s.interfaceCount,
      dt: acc.dt + s.dataTypeCount,
      ports: acc.ports + s.portCount,
    }),
    { swc: 0, iface: 0, dt: 0, ports: 0 },
  );

  return (
    <div className="relative min-h-screen">
      {/* 배경 장식 */}
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[560px]" />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(46,205,247,0.35), transparent)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="animate-scan h-24 w-full bg-gradient-to-b from-transparent via-accent/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-24">
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-line py-5">
          <Wordmark />
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-fog uppercase">
            <span className="hidden items-center gap-1.5 sm:flex">
              <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-mint" />
              DB Connected
            </span>
            <span className="hidden sm:inline text-fog/40">/</span>
            <span>R23-11 Schema</span>
          </div>
        </header>

        {/* 히어로 */}
        <section className="relative pt-16 pb-14">
          <div className="mb-4 flex items-center gap-3 font-mono text-[10px] tracking-[0.34em] text-accent uppercase">
            <span className="h-px w-10 bg-accent/60" />
            Classic Platform · SW-C Authoring
          </div>
          <h1 className="font-display max-w-3xl text-5xl leading-[1.02] font-bold tracking-tight text-snow md:text-7xl">
            AUTOSAR
            <br />
            <span className="bg-gradient-to-r from-accent via-[#7ee2ff] to-mint bg-clip-text text-transparent">
              프로젝트 스튜디오
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-fog">
            소프트웨어 컴포넌트, 포트 인터페이스, 데이터 타입, Runnable까지 —
            브라우저에서 AUTOSAR Classic 아키텍처를 설계하고 표준{" "}
            <span className="font-mono text-mist">ARXML</span>을 즉시
            생성합니다.
          </p>

          {/* 통계 스트립 */}
          <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-xl border border-line md:grid-cols-4">
            {[
              { icon: Database, label: "Projects", value: summaries.length },
              { icon: Boxes, label: "SW-Components", value: totals.swc },
              { icon: Waypoints, label: "Port Interfaces", value: totals.iface },
              { icon: Braces, label: "Data Types", value: totals.dt },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`flex items-center gap-3.5 bg-ink-900/60 px-5 py-4 ${
                  i > 0 ? "border-l border-line max-md:border-l-0 max-md:odd:border-l-0 md:border-l" : ""
                } ${i >= 2 ? "max-md:border-t max-md:border-line" : ""}`}
              >
                <s.icon className="h-4.5 w-4.5 text-accent/80" strokeWidth={1.6} />
                <div>
                  <div className="font-display text-xl leading-none font-bold text-snow tabular-nums">
                    {s.value}
                  </div>
                  <div className="mt-1.5 font-mono text-[9px] tracking-[0.18em] text-fog uppercase">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 프로젝트 목록 */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight text-snow">
                워크스페이스
              </h2>
              <Chip color="gray">{summaries.length} PROJ</Chip>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
                <FileUp className="h-3.5 w-3.5" />
                ARXML 가져오기
              </Button>
              <Button size="sm" onClick={() => setCreating(true)}>
                <FolderPlus className="h-3.5 w-3.5" />새 프로젝트
              </Button>
            </div>
          </div>

          {summaries.length === 0 ? (
            <div className="panel flex flex-col items-center gap-4 px-6 py-16 text-center">
              <LogoMark size={52} />
              <div className="font-display text-xl font-semibold text-mist">
                아직 AUTOSAR 프로젝트가 없습니다
              </div>
              <p className="max-w-md text-sm text-fog">
                ACC(어댑티브 크루즈 컨트롤) 데모로 전체 구조를 먼저 살펴 보거나,
                처음부터 직접 설계를 시작하세요.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  loading={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await createDemoProject();
                      if (r.ok && r.data) router.push(`/projects/${r.data.id}`);
                      else if (!r.ok) toast(r.error, "error");
                    })
                  }
                >
                  <Sparkles className="h-4 w-4" />
                  ACC 데모 생성
                </Button>
                <Button variant="outline" onClick={() => setCreating(true)}>
                  직접 만들기
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summaries.map((s, i) => (
                <motion.div
                  key={s.project.id}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: [0.21, 0.9, 0.32, 1] }}
                >
                  <Link
                    href={`/projects/${s.project.id}`}
                    className="panel panel-hover group relative flex h-full flex-col p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-800 text-accent">
                          <Cpu className="h-4.5 w-4.5" strokeWidth={1.6} />
                        </div>
                        <div>
                          <div className="font-display text-[15px] font-semibold tracking-tight text-snow">
                            {s.project.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-fog">
                            /{s.project.arPackageRoot}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-fog transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-fog">
                      {s.project.description || "설명이 없습니다."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <Chip color="cyan">{s.project.autosarVersion}</Chip>
                      <Chip color="violet">{s.project.schema}</Chip>
                      <Chip color="gray">AR-PACKAGE</Chip>
                    </div>

                    <div className="mt-4 flex items-center gap-4 border-t border-line pt-3.5 font-mono text-[10px] text-fog">
                      <span>
                        <b className="text-mist">{s.swcCount}</b> SWC
                      </span>
                      <span>
                        <b className="text-mist">{s.interfaceCount}</b> IF
                      </span>
                      <span>
                        <b className="text-mist">{s.portCount}</b> PORT
                      </span>
                      <span>
                        <b className="text-mist">{s.runnableCount}</b> RUN
                      </span>
                      <span className="ml-auto">{timeAgo(s.project.updatedAt)}</span>
                    </div>

                    <div className="absolute right-3 bottom-2 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        aria-label="프로젝트 복제"
                        title="복제"
                        className="cursor-pointer rounded-md p-1.5 text-fog/50 transition-colors hover:bg-accent/10 hover:text-accent"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          doDuplicate(s.project.id);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label="프로젝트 삭제"
                        title="삭제"
                        className="cursor-pointer rounded-md p-1.5 text-fog/50 transition-colors hover:bg-rose/10 hover:text-rose"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleting(s);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* 새 프로젝트 카드 */}
              <motion.button
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: summaries.length * 0.07, duration: 0.5 }}
                onClick={() => setCreating(true)}
                className="group flex min-h-[210px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-line-bright text-fog transition-all hover:border-accent/50 hover:text-accent"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-800 transition-colors group-hover:border-accent/50">
                  <Plug2 className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <span className="text-xs font-medium tracking-wide">
                  새 AUTOSAR 프로젝트 저작
                </span>
              </motion.button>
            </div>
          )}
        </section>
      </div>

      {/* 생성 모달 */}
      <CreateProjectModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => router.push(`/projects/${id}`)}
      />

      {/* ARXML 임포트 모달 */}
      <ImportModal open={importing} onClose={() => setImporting(false)} />

      {/* 삭제 확인 */}
      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="프로젝트 삭제"
        message={
          <>
            <b className="font-mono text-snow">{deleting?.project.name}</b>
            {" "}프로젝트와 포함된 모든 SWC, 인터페이스, 커넥터가 영구
            삭제됩니다. 계속하시겠습니까?
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          await deleteProject(deleting.project.id);
          toast("프로젝트가 삭제되었습니다.");
          router.refresh();
        }}
      />
    </div>
  );
}

/* ── 프로젝트 생성 모달 ───────────────────────────── */
function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    arPackageRoot: "",
    autosarVersion: "R23-11",
    schema: "classic",
    description: "",
  });
  const [rootTouched, setRootTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const deriveRoot = (name: string) =>
    name
      .replace(/[^A-Za-z0-9_]/g, "")
      .replace(/^([0-9])/, "_$1")
      .slice(0, 32);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await createProject({
        ...form,
        arPackageRoot: form.arPackageRoot || deriveRoot(form.name) || "Root",
      });
      if (r.ok && r.data) {
        onCreated(r.data.id);
        onClose();
        setForm({
          name: "",
          arPackageRoot: "",
          autosarVersion: "R23-11",
          schema: "classic",
          description: "",
        });
      } else if (!r.ok) {
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
      title="새 AUTOSAR 프로젝트"
      sub="AR-PACKAGE 루트와 스키마 버전을 지정합니다"
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button loading={busy} onClick={submit}>
            <ArrowRight className="h-4 w-4" />
            프로젝트 생성
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="프로젝트 이름">
          <Input
            value={form.name}
            autoFocus
            placeholder="예: BodyControlModule"
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({
                ...f,
                name,
                arPackageRoot: rootTouched ? f.arPackageRoot : deriveRoot(name),
              }));
            }}
          />
        </Field>
        <Field label="AR-PACKAGE 루트" hint="SHORT-NAME">
          <Input
            value={form.arPackageRoot}
            className="font-mono"
            placeholder="예: BCM"
            onChange={(e) => {
              setRootTouched(true);
              setForm((f) => ({ ...f, arPackageRoot: e.target.value }));
            }}
          />
        </Field>
        <Field label="AUTOSAR 스키마 버전">
          <Select
            value={form.autosarVersion}
            onChange={(e) =>
              setForm((f) => ({ ...f, autosarVersion: e.target.value }))
            }
          >
            {["R24-11", "R23-11", "R22-11", "R21-11", "R20-11"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="플랫폼">
          <Select
            value={form.schema}
            onChange={(e) => setForm((f) => ({ ...f, schema: e.target.value }))}
          >
            <option value="classic">Classic Platform</option>
            <option value="adaptive">Adaptive (Experimental)</option>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="설명">
            <Textarea
              value={form.description}
              placeholder="ECU 역할, 적용 도메인, 연동 도구체인 등"
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* ── ARXML 임포트 모달 ───────────────────────────── */
function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const readFile = async (file: File) => {
    setParseError(null);
    const text = await file.text();
    try {
      const p = parseArxml(text);
      if (
        p.components.length === 0 &&
        p.interfaces.length === 0 &&
        p.dataTypes.length === 0
      ) {
        setParseError("임포트할 AUTOSAR 요소가 파일에 없습니다.");
        setPayload(null);
        return;
      }
      if (p.components.length === 0) {
        setParseError(
          "SW-COMPONENT-TYPE이 없습니다. 인터페이스/타입만 임포트됩니다.",
        );
      }
      setPayload(p);
    } catch (e) {
      setPayload(null);
      setParseError(
        e instanceof Error ? e.message : "ARXML 파싱에 실패했습니다.",
      );
    }
  };

  const doImport = async () => {
    if (!payload) return;
    setBusy(true);
    try {
      const r = await importProject(payload);
      if (r.ok && r.data) {
        toast(`프로젝트 '${payload.arPackageRoot}' 임포트 완료`);
        onClose();
        setPayload(null);
        router.push(`/projects/${r.data.id}`);
      } else if (!r.ok) {
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
      title="ARXML 가져오기"
      sub="기존 툴체인(DaVinci, ISOLAR)의 .arxml 파일을 파싱해 새 프로젝트로 생성합니다"
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button loading={busy} disabled={!payload} onClick={doImport}>
            <FileUp className="h-4 w-4" />
            임포트 실행
          </Button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void readFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
          drag
            ? "border-accent bg-accent/5"
            : "border-line-bright hover:border-accent/50 hover:bg-ink-800/40"
        }`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-800 text-accent">
          <FileUp className="h-5 w-5" strokeWidth={1.6} />
        </div>
        <div className="text-sm font-medium text-mist">
          .arxml 파일을 드롭하거나 클릭해서 선택
        </div>
        <div className="font-mono text-[10px] text-fog">
          SWC · PORT · INTERFACE · DATA-TYPE · ASSEMBLY-SW-CONNECTOR 파싱
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".arxml,.xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void readFile(f);
          }}
        />
      </div>

      {parseError && (
        <p className="mt-3 rounded-lg border border-amberx/30 bg-amberx/5 px-3.5 py-2.5 text-xs text-amberx">
          {parseError}
        </p>
      )}

      {payload && (
        <div className="mt-4 space-y-3">
          <Field label="AR-PACKAGE 루트 / 프로젝트 이름">
            <Input
              value={payload.arPackageRoot}
              className="font-mono"
              onChange={(e) =>
                setPayload({
                  ...payload,
                  arPackageRoot: e.target.value,
                  name: e.target.value,
                })
              }
            />
          </Field>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              ["SWC", payload.components.length],
              ["PORT", payload.components.reduce((a, c) => a + c.ports.length, 0)],
              ["RUN", payload.components.reduce((a, c) => a + c.runnables.length, 0)],
              ["IF", payload.interfaces.length],
              ["DT", payload.dataTypes.length],
              ["CONN", payload.connections.length],
            ].map(([k, v]) => (
              <div
                key={k as string}
                className="rounded-lg border border-line bg-ink-900/60 px-3 py-2.5 text-center"
              >
                <div className="font-display text-lg font-bold text-accent">
                  {v}
                </div>
                <div className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-fog">
                  {k}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export { Spinner };
