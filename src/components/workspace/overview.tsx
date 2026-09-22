"use client";

import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Braces,
  CheckCircle2,
  FileTerminal,
  OctagonAlert,
  PlayCircle,
  Plug2,
  Waypoints,
} from "lucide-react";
import { Chip } from "@/components/ui";
import {
  SWC_CATEGORIES,
  type FullProject,
  type ProjectIssue,
} from "@/lib/types";
import type { TabId } from "@/components/workspace/workspace";

const CAT_COLORS: Record<string, string> = {
  application: "bg-accent",
  sensoractuator: "bg-mint",
  composition: "bg-violet",
  service: "bg-amberx",
  nvblock: "bg-rose",
  parameter: "bg-[#7ad9f6]",
  "ecu-abstraction": "bg-[#f3a75d]",
  "complex-device-driver": "bg-[#9aa7ff]",
};

export function OverviewTab({
  full,
  issues,
  go,
}: {
  full: FullProject;
  issues: ProjectIssue[];
  go: (t: TabId) => void;
}) {
  const { project, components, interfaces, dataTypes, connections } = full;
  const runCount = components.reduce((a, c) => a + c.runnables.length, 0);
  const portCount = components.reduce((a, c) => a + c.ports.length, 0);
  const errors = issues.filter((i) => i.level === "error");

  const byCat = new Map<string, number>();
  for (const c of components) byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1);
  const catTotal = components.length || 1;

  const stats = [
    { icon: Boxes, label: "SW-Components", sub: "Atomic + Composition", value: components.length, tab: "components" as TabId },
    { icon: Plug2, label: "Port Prototypes", sub: "P-Port + R-Port", value: portCount, tab: "components" as TabId },
    { icon: Waypoints, label: "Interfaces", sub: "S-R / C-S", value: interfaces.length, tab: "interfaces" as TabId },
    { icon: Braces, label: "Data Types", sub: "Application Types", value: dataTypes.length, tab: "datatypes" as TabId },
    { icon: PlayCircle, label: "Runnables", sub: "RTE Events", value: runCount, tab: "components" as TabId },
    { icon: FileTerminal, label: "Connectors", sub: "Assembly", value: connections.length, tab: "topology" as TabId },
  ];

  return (
    <div className="px-7 py-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => go(s.tab)}
            className="panel panel-hover group cursor-pointer p-4 text-left"
          >
            <s.icon className="h-4 w-4 text-accent/80" strokeWidth={1.7} />
            <div className="font-display mt-3 text-2xl font-bold text-snow tabular-nums">
              {s.value}
            </div>
            <div className="mt-1 text-[11px] font-medium text-mist">
              {s.label}
            </div>
            <div className="font-mono text-[9px] tracking-[0.14em] text-fog/70 uppercase">
              {s.sub}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        {/* 검증 리포트 */}
        <div className="panel xl:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2">
              <OctagonAlert className="h-4 w-4 text-amberx" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-snow">
                모델 검증 리포트
              </span>
            </div>
            <div className="flex gap-1.5">
              <Chip color={errors.length > 0 ? "rose" : "mint"}>
                {errors.length} ERR
              </Chip>
              <Chip
                color={
                  issues.length - errors.length > 0 ? "amber" : "gray"
                }
              >
                {issues.length - errors.length} WARN
              </Chip>
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto px-4 py-3">
            {issues.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-mint/25 bg-mint/5 px-4 py-4 text-sm text-mint">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                모든 규칙을 통과했습니다. ARXML Export를 실행할 수 있습니다.
              </div>
            ) : (
              <div className="space-y-1.5">
                {issues.map((i, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs ${
                      i.level === "error"
                        ? "border-rose/25 bg-rose/5"
                        : "border-amberx/20 bg-amberx/5"
                    }`}
                  >
                    <AlertTriangle
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        i.level === "error" ? "text-rose" : "text-amberx"
                      }`}
                    />
                    <div className="leading-relaxed">
                      <span
                        className={`mr-2 font-mono font-semibold ${
                          i.level === "error" ? "text-rose" : "text-amberx"
                        }`}
                      >
                        [{i.target}]
                      </span>
                      <span className="text-mist">{i.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {issues.length > 0 && (
            <div className="border-t border-line px-5 py-3">
              <button
                onClick={() => go("export")}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-snow"
              >
                ARXML Export로 이동
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 카테고리 분포 + 메타 */}
        <div className="flex flex-col gap-4 xl:col-span-2">
          <div className="panel p-5">
            <div className="mb-4 text-sm font-semibold text-snow">
              SWC 카테고리 분포
            </div>
            {components.length === 0 ? (
              <p className="text-xs text-fog">등록된 SWC가 없습니다.</p>
            ) : (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-800">
                  {[...byCat.entries()].map(([cat, n]) => (
                    <div
                      key={cat}
                      className={`${CAT_COLORS[cat] ?? "bg-fog"} h-full transition-all`}
                      style={{ width: `${(n / catTotal) * 100}%` }}
                      title={`${cat}: ${n}`}
                    />
                  ))}
                </div>
                <div className="mt-3.5 space-y-2">
                  {[...byCat.entries()].map(([cat, n]) => (
                    <div key={cat} className="flex items-center gap-2 text-xs">
                      <span
                        className={`h-2 w-2 rounded-full ${CAT_COLORS[cat] ?? "bg-fog"}`}
                      />
                      <span className="flex-1 text-mist">
                        {SWC_CATEGORIES.find((c) => c.value === cat)?.label ??
                          cat}
                      </span>
                      <span className="font-mono text-fog">{n}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="panel flex-1 p-5">
            <div className="mb-3 text-sm font-semibold text-snow">
              프로젝트 메타데이터
            </div>
            <dl className="space-y-2.5 text-xs">
              {[
                ["AR-PACKAGE", `/${project.arPackageRoot}`, true],
                ["Schema", `${project.autosarVersion} · ${project.schema}`, false],
                [
                  "생성",
                  new Date(project.createdAt).toLocaleDateString("ko-KR"),
                  false,
                ],
                [
                  "최근 수정",
                  new Date(project.updatedAt).toLocaleString("ko-KR"),
                  false,
                ],
              ].map(([k, v, mono]) => (
                <div key={k as string} className="flex items-baseline gap-3">
                  <dt className="w-24 shrink-0 font-mono text-[10px] tracking-[0.14em] text-fog uppercase">
                    {k}
                  </dt>
                  <dd
                    className={`min-w-0 truncate text-mist ${mono ? "font-mono" : ""}`}
                  >
                    {v}
                  </dd>
                </div>
              ))}
              {project.description && (
                <p className="border-t border-line pt-3 leading-relaxed text-fog">
                  {project.description}
                </p>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
