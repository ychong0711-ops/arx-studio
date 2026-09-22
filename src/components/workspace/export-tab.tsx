"use client";

import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileCog,
  FileType2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Chip, Segmented, Spinner } from "@/components/ui";
import { CodeView } from "@/components/workspace/code-view";
import { getArxml, getRteFiles } from "@/lib/actions";
import type { CodeFile } from "@/lib/rte";
import type { FullProject, ProjectIssue } from "@/lib/types";

type Mode = "arxml" | "rte";

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportTab({
  full,
  issues,
}: {
  full: FullProject;
  issues: ProjectIssue[];
}) {
  const [mode, setMode] = useState<Mode>("arxml");
  const [arxml, setArxml] = useState<string | null>(null);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activePath, setActivePath] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, f] = await Promise.all([
      getArxml(full.project.id),
      getRteFiles(full.project.id),
    ]);
    if (a.ok && a.data) {
      setArxml(a.data.arxml);
      setError(null);
    } else if (!a.ok) setError(a.error);
    if (f.ok && f.data) {
      setFiles(f.data.files);
      setActivePath((cur) => cur || f.data!.files[0]?.path || "");
    }
    setLoading(false);
  }, [full.project.id]);

  useEffect(() => {
    // 초기/갱신 시 서버에서 ARXML·RTE 산출물을 동기화하는 합법적 effect
    // (로딩 상태를 effect 본문에서 동기적으로 갱신 → 규칙 제외)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, full.project.updatedAt]);

  // 커맨드 팔레트 다운로드 명령
  useEffect(() => {
    const onDownload = () => {
      const a = document.createElement("a");
      a.href = `/api/projects/${full.project.id}/export`;
      a.download = "";
      a.click();
    };
    window.addEventListener("arx:download", onDownload);
    return () => window.removeEventListener("arx:download", onDownload);
  }, [full.project.id]);

  const errors = issues.filter((i) => i.level === "error").length;
  const active: CodeFile | undefined =
    files.find((x) => x.path === activePath) ?? files[0];

  const stats = useMemo(() => {
    if (mode === "arxml" && arxml) {
      return {
        name: `${full.project.arPackageRoot}.arxml`,
        lines: arxml.split("\n").length,
        kb: (new Blob([arxml]).size / 1024).toFixed(1),
      };
    }
    if (mode === "rte" && active) {
      return {
        name: active.path,
        lines: active.content.split("\n").length,
        kb: (new Blob([active.content]).size / 1024).toFixed(1),
      };
    }
    return { name: "—", lines: 0, kb: "0" };
  }, [mode, arxml, active, full.project.arPackageRoot]);

  const currentCode = mode === "arxml" ? (arxml ?? "") : (active?.content ?? "");
  const currentLang = mode === "arxml" ? "xml" : (active?.lang ?? "c");

  return (
    <div className="flex h-full flex-col px-7 py-6">
      {/* 검증 배너 */}
      <div
        className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs ${
          errors > 0
            ? "border-rose/30 bg-rose/5 text-rose"
            : "border-mint/30 bg-mint/5 text-mint"
        }`}
      >
        {errors > 0 ? (
          <ShieldAlert className="h-4 w-4 shrink-0" />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0" />
        )}
        <span className="flex-1">
          {errors > 0
            ? `${errors}건의 오류가 있습니다. 파일은 생성되지만 툴체인 임포트 전 수정을 권장합니다.`
            : "모델 검증 통과. ARXML과 RTE 계약 코드가 프로젝트 데이터와 동기화됩니다."}
        </span>
        <Segmented<Mode>
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: "arxml", label: "ARXML" },
            { value: "rte", label: "RTE Contract (C)" },
          ]}
        />
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* RTE 파일 레일 */}
        {mode === "rte" && (
          <div className="panel flex w-[218px] shrink-0 flex-col overflow-hidden">
            <div className="border-b border-line px-4 py-3 font-mono text-[9.5px] tracking-[0.2em] text-fog uppercase">
              RTE 계약 파일 · {files.length}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setActivePath(f.path)}
                  className={`mb-0.5 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-[11px] transition-colors ${
                    active?.path === f.path
                      ? "bg-ink-700 text-snow"
                      : "text-fog hover:bg-ink-800 hover:text-mist"
                  }`}
                >
                  {f.lang === "h" ? (
                    <FileCode2 className="h-3.5 w-3.5 shrink-0 text-accent/80" />
                  ) : (
                    <FileType2 className="h-3.5 w-3.5 shrink-0 text-mint/80" />
                  )}
                  <span className="truncate">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 파일 카드 */}
        <div className="panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-800 text-accent">
                {mode === "arxml" ? (
                  <FileCode2 className="h-4 w-4" strokeWidth={1.7} />
                ) : (
                  <FileCog className="h-4 w-4" strokeWidth={1.7} />
                )}
              </div>
              <div>
                <div className="font-mono text-[13px] font-semibold text-snow">
                  {stats.name}
                </div>
                <div className="font-mono text-[9.5px] text-fog">
                  {stats.lines} lines · {stats.kb} KB · schema{" "}
                  {full.project.autosarVersion}
                  {mode === "rte" ? " · Classic RTE contract" : ""}
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                loading={loading}
                onClick={() => void load()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                재생성
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!currentCode}
                onClick={async () => {
                  await navigator.clipboard.writeText(currentCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-mint" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "복사됨" : "복사"}
              </Button>
              {mode === "arxml" ? (
                <a href={`/api/projects/${full.project.id}/export`} download>
                  <Button size="sm" disabled={!arxml}>
                    <Download className="h-3.5 w-3.5" />
                    .arxml
                  </Button>
                </a>
              ) : (
                <Button
                  size="sm"
                  disabled={!active}
                  onClick={() => active && downloadText(active.path, active.content)}
                >
                  <Download className="h-3.5 w-3.5" />
                  파일 저장
                </Button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {error ? (
              <div className="p-4 font-mono text-xs text-rose">
                생성 실패: {error}
              </div>
            ) : currentCode ? (
              <CodeView code={currentCode} lang={currentLang} maxHeight="100%" />
            ) : (
              <div className="flex h-full items-center justify-center gap-3 text-fog">
                <Spinner /> 코드 생성 중…
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-fog/70">
        <span>
          {mode === "arxml"
            ? "DaVinci Developer, ISOLAR-A/B, AUTOSAR Builder 등 표준 툴체인으로 임포트할 수 있습니다."
            : "Rte_Type.h + SW-C별 계약 헤더/스켈레톤입니다. VFB 계약 단계 리뷰와 구현 착수에 바로 사용할 수 있습니다."}
        </span>
        <Chip color="gray" className="ml-auto">
          {files.length + 1} artifacts
        </Chip>
      </div>
    </div>
  );
}
