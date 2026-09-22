"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Braces,
  CornerDownLeft,
  Download,
  FileCode2,
  LayoutDashboard,
  Network,
  Plus,
  Search,
  Timer,
  Waypoints,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FullProject } from "@/lib/types";
import type { TabId } from "@/components/workspace/workspace";

interface Item {
  id: string;
  label: string;
  sub: string;
  icon: typeof Boxes;
  tab: TabId;
  event?: { type: string; id?: string };
  keywords: string;
}

export function CommandPalette({
  full,
  go,
}: {
  full: FullProject;
  go: (t: TabId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [prevQuery, setPrevQuery] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // 쿼리가 바뀌면 커서를 0으로 — 렌더 중 상태 조정(React 권장 패턴)
  if (query !== prevQuery) {
    setPrevQuery(query);
    setCursor(0);
  }

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [
      { id: "go-overview", label: "개요로 이동", sub: "탭", icon: LayoutDashboard, tab: "overview", keywords: "overview 개요 대시보드" },
      { id: "go-components", label: "SW 컴포넌트로 이동", sub: "탭", icon: Boxes, tab: "components", keywords: "swc 컴포넌트 component" },
      { id: "go-interfaces", label: "포트 인터페이스로 이동", sub: "탭", icon: Waypoints, tab: "interfaces", keywords: "interface 인터페이스" },
      { id: "go-datatypes", label: "데이터 타입으로 이동", sub: "탭", icon: Braces, tab: "datatypes", keywords: "datatype 타입" },
      { id: "go-topology", label: "토폴로지로 이동", sub: "탭", icon: Network, tab: "topology", keywords: "topology 연결 캔버스" },
      { id: "go-timing", label: "타이밍/스케줄로 이동", sub: "탭", icon: Timer, tab: "timing", keywords: "timing schedule 스케줄" },
      { id: "go-export", label: "ARXML / RTE Export", sub: "명령", icon: FileCode2, tab: "export", keywords: "export arxml rte 코드 생성" },
      { id: "act-new-swc", label: "새 SWC 만들기", sub: "명령", icon: Plus, tab: "components", event: { type: "arx:new-swc" }, keywords: "새 swc 추가 create" },
      { id: "act-new-iface", label: "새 인터페이스 만들기", sub: "명령", icon: Plus, tab: "interfaces", event: { type: "arx:new-iface" }, keywords: "새 인터페이스 추가" },
      { id: "act-new-dt", label: "새 데이터 타입 만들기", sub: "명령", icon: Plus, tab: "datatypes", event: { type: "arx:new-dt" }, keywords: "새 타입 추가" },
      { id: "act-download", label: ".arxml 파일 다운로드", sub: "명령", icon: Download, tab: "export", event: { type: "arx:download" }, keywords: "다운로드 download arxml 저장" },
    ];
    for (const c of full.components) {
      list.push({
        id: `swc-${c.id}`,
        label: c.name,
        sub: `SWC · ${c.category}`,
        icon: Boxes,
        tab: "components",
        event: { type: "arx:edit-swc", id: c.id },
        keywords: `swc ${c.name} ${c.category} ${c.description}`,
      });
    }
    for (const f of full.interfaces) {
      list.push({
        id: `if-${f.id}`,
        label: f.name,
        sub: `Interface · ${f.kind === "sender-receiver" ? "S/R" : "C/S"}`,
        icon: Waypoints,
        tab: "interfaces",
        keywords: `interface ${f.name} ${f.kind}`,
      });
    }
    for (const d of full.dataTypes) {
      list.push({
        id: `dt-${d.id}`,
        label: d.name,
        sub: `DataType · ${d.baseType}`,
        icon: Braces,
        tab: "datatypes",
        keywords: `datatype ${d.name} ${d.baseType}`,
      });
    }
    return list;
  }, [full]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 14);
    return items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.keywords.toLowerCase().includes(q),
      )
      .slice(0, 14);
  }, [items, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const run = (item: Item) => {
    go(item.tab);
    setOpen(false);
    if (item.event) {
      setTimeout(
        () =>
          window.dispatchEvent(
            new CustomEvent(item.event!.type, {
              detail: item.event!.id ? { id: item.event!.id } : undefined,
            }),
          ),
        160,
      );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="panel relative w-full max-w-xl overflow-hidden shadow-panel"
            initial={{ scale: 0.96, y: -12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: -8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
              <Search className="h-4 w-4 text-accent" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, filtered.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (e.key === "Enter" && filtered[cursor]) {
                    run(filtered[cursor]);
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="SWC, 인터페이스, 타입, 명령 검색…"
                className="flex-1 bg-transparent text-sm text-snow outline-none placeholder:text-fog/50"
              />
              <kbd className="chip text-fog">ESC</kbd>
            </div>
            <div className="max-h-[46vh] overflow-y-auto p-1.5">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-fog">
                  일치하는 항목이 없습니다
                </div>
              )}
              {filtered.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => run(item)}
                  onMouseEnter={() => setCursor(i)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    cursor === i ? "bg-ink-700" : ""
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${cursor === i ? "text-accent" : "text-fog"}`}
                    strokeWidth={1.7}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-mist">
                    {item.label}
                  </span>
                  <span className="chip shrink-0 text-fog/80">{item.sub}</span>
                  {cursor === i && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-accent/70" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[9.5px] text-fog/70">
              <span>↑↓ 이동</span>
              <span>↵ 실행</span>
              <span className="ml-auto">⌘K 닫기</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
