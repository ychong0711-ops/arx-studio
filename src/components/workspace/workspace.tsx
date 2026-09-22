"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Braces,
  Boxes,
  CheckCircle2,
  FileCode2,
  LayoutDashboard,
  Network,
  Search,
  ShieldAlert,
  Timer,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/components/dashboard/dashboard";
import { Chip } from "@/components/ui";
import { CommandPalette } from "@/components/workspace/command-palette";
import { ComponentsTab } from "@/components/workspace/components-tab";
import { DataTypesTab } from "@/components/workspace/datatypes-tab";
import { ExportTab } from "@/components/workspace/export-tab";
import { InterfacesTab } from "@/components/workspace/interfaces-tab";
import { OverviewTab } from "@/components/workspace/overview";
import { TimingTab } from "@/components/workspace/timing-tab";
import { TopologyTab } from "@/components/workspace/topology-tab";
import type { FullProject, ProjectIssue } from "@/lib/types";

export type TabId =
  | "overview"
  | "components"
  | "interfaces"
  | "datatypes"
  | "topology"
  | "timing"
  | "export";

const TABS: {
  id: TabId;
  label: string;
  eng: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "개요", eng: "Overview", icon: LayoutDashboard },
  { id: "components", label: "SW 컴포넌트", eng: "SW-C", icon: Boxes },
  { id: "interfaces", label: "포트 인터페이스", eng: "Interface", icon: Waypoints },
  { id: "datatypes", label: "데이터 타입", eng: "DataType", icon: Braces },
  { id: "topology", label: "토폴로지", eng: "Assembly", icon: Network },
  { id: "timing", label: "타이밍/스케줄", eng: "Schedule", icon: Timer },
  { id: "export", label: "ARXML Export", eng: "Export .arxml", icon: FileCode2 },
];

const COUNT_OF: Record<TabId, (f: FullProject) => number | null> = {
  overview: () => null,
  components: (f) => f.components.length,
  interfaces: (f) => f.interfaces.length,
  datatypes: (f) => f.dataTypes.length,
  topology: (f) => f.connections.length,
  timing: (f) => f.components.reduce((a, c) => a + c.runnables.length, 0),
  export: () => null,
};

export function Workspace({
  full,
  issues,
}: {
  full: FullProject;
  issues: ProjectIssue[];
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── 사이드바 ─────────────────────────────── */}
      <aside className="flex w-[232px] shrink-0 flex-col border-r border-line bg-ink-900/80">
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Link
            href="/"
            className="group flex items-center gap-2 text-fog transition-colors hover:text-snow"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-ink-800 transition-colors group-hover:border-accent/40">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
          </Link>
          <LogoMark size={26} />
          <div className="leading-none">
            <div className="font-display text-[13px] font-bold tracking-[0.16em] text-snow">
              ARX<span className="text-accent">STUDIO</span>
            </div>
            <div className="mt-1 font-mono text-[8px] tracking-[0.28em] text-fog uppercase">
              Workspace
            </div>
          </div>
        </div>

        {/* 프로젝트 식별자 */}
        <div className="border-b border-line px-4 py-4">
          <div className="truncate font-display text-[15px] font-semibold tracking-tight text-snow">
            {full.project.name}
          </div>
          <div className="mt-1 truncate font-mono text-[10px] text-fog">
            /{full.project.arPackageRoot}
          </div>
          <div className="mt-2.5 flex gap-1.5">
            <Chip color="cyan">{full.project.autosarVersion}</Chip>
            <Chip color="violet">{full.project.schema}</Chip>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            const count = COUNT_OF[t.id](full);
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                  isActive ? "text-snow" : "text-fog hover:text-mist"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg border border-line-bright bg-ink-750"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {isActive && (
                  <motion.span
                    layoutId="nav-bar"
                    className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent shadow-glow"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <t.icon
                  className={`relative h-4 w-4 ${isActive ? "text-accent" : ""}`}
                  strokeWidth={1.7}
                />
                <span className="relative flex-1 truncate">{t.label}</span>
                {count !== null && (
                  <span className="relative font-mono text-[10px] text-fog">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* 검증 상태 */}
        <div className="border-t border-line px-4 py-4">
          <button
            onClick={() => setTab("export")}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
              errors > 0
                ? "border-rose/40 bg-rose/5 text-rose hover:bg-rose/10"
                : warnings > 0
                  ? "border-amberx/40 bg-amberx/5 text-amberx hover:bg-amberx/10"
                  : "border-mint/40 bg-mint/5 text-mint hover:bg-mint/10"
            }`}
          >
            {errors > 0 || warnings > 0 ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span className="flex-1 text-left">
              {errors > 0
                ? `오류 ${errors}건 · 경고 ${warnings}건`
                : warnings > 0
                  ? `경고 ${warnings}건`
                  : "ARXML Export 준비 완료"}
            </span>
          </button>
        </div>
      </aside>

      {/* ── 메인 ─────────────────────────────────── */}
      <main className="relative flex min-w-0 flex-1 flex-col bg-ink-950">
        <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60" />
        {/* 상단 바 */}
        <header className="relative flex items-center justify-between border-b border-line px-7 py-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-xl font-bold tracking-tight text-snow">
              {active.label}
            </h1>
            <span className="font-mono text-[10px] tracking-[0.26em] text-fog/70 uppercase">
              {active.eng}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-fog">
            <button
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    ctrlKey: true,
                    bubbles: true,
                  }),
                )
              }
              className="hidden cursor-pointer items-center gap-2 rounded-lg border border-line bg-ink-900/60 px-3 py-1.5 transition-colors hover:border-line-bright hover:text-mist md:flex"
            >
              <Search className="h-3 w-3" />
              빠른 검색
              <kbd className="rounded border border-line-bright px-1 text-[9px]">
                ⌘K
              </kbd>
            </button>
            <span className="hidden lg:inline">
              /{full.project.arPackageRoot}/ComponentTypes
            </span>
          </div>
        </header>

        {/* 탭 콘텐츠 */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              className="h-full overflow-y-auto"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.32, 0.9, 0.4, 1] }}
            >
              {tab === "overview" && <OverviewTab full={full} issues={issues} go={setTab} />}
              {tab === "components" && <ComponentsTab full={full} />}
              {tab === "interfaces" && <InterfacesTab full={full} />}
              {tab === "datatypes" && <DataTypesTab full={full} />}
              {tab === "topology" && (
                <div className="h-full">
                  <TopologyTab full={full} />
                </div>
              )}
              {tab === "timing" && <TimingTab full={full} />}
              {tab === "export" && <ExportTab full={full} issues={issues} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 커맨드 팔레트 (⌘K) */}
      <CommandPalette full={full} go={setTab} />
    </div>
  );
}
