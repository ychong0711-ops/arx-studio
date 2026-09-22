"use client";

import { motion } from "framer-motion";
import { Activity, Gauge, Layers, Play, Timer, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/ui";
import type { FullProject } from "@/lib/types";

const PALETTE = ["#2ecdf7", "#3ddc97", "#f6b73c", "#9b87f5", "#f0648c", "#7ad9f6"];

interface Task {
  swc: string;
  swcId: string;
  name: string;
  period: number;
  color: string;
  order: number;
}

const EXEC_MS = 0.5; // Runnable 추정 실행시간 (데모 고정값)

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}
function hyperperiod(periods: number[]): number {
  let h = 1;
  for (const p of periods) {
    h = lcm(h, p);
    if (h > 10000) return 10000;
  }
  return h;
}

export function TimingTab({ full }: { full: FullProject }) {
  const [window, setWindowMs] = useState(100);

  const { tasks, inits, swcColor } = useMemo(() => {
    const colorMap = new Map<string, string>();
    let ci = 0;
    const tasks: Task[] = [];
    const inits: { swc: string; name: string }[] = [];
    for (const c of full.components) {
      if (!colorMap.has(c.id)) colorMap.set(c.id, PALETTE[ci++ % PALETTE.length]);
      for (const r of c.runnables) {
        if (r.eventType === "timing" && r.periodMs > 0) {
          tasks.push({
            swc: c.name,
            swcId: c.id,
            name: r.name,
            period: r.periodMs,
            color: colorMap.get(c.id)!,
            order: 0,
          });
        } else if (r.eventType === "init") {
          inits.push({ swc: c.name, name: r.name });
        }
      }
    }
    // RMS 우선순위: 주기가 짧을수록 높은 우선순위
    tasks.sort((a, b) => a.period - b.period || a.name.localeCompare(b.name));
    tasks.forEach((t, i) => (t.order = i + 1));
    return { tasks, inits, swcColor: colorMap };
  }, [full]);

  const hp = hyperperiod(tasks.map((t) => t.period));
  const util = tasks.reduce(
    (acc, t) => acc + (EXEC_MS * Math.ceil(window / t.period)) / window,
    0,
  );
  const ticks = window / 10 + 1;

  return (
    <div className="px-7 py-6">
      {/* 헤더 통계 */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="mr-auto text-xs text-fog">
          타이밍 이벤트 기반 RTE 태스크 스케줄 시뮬레이션 (RMS 정적 우선순위,
          추정 WCET {EXEC_MS}ms)
        </p>
        <div className="panel flex items-center gap-2 px-3 py-1.5 text-xs">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <span className="text-fog">태스크</span>
          <b className="font-mono text-snow">{tasks.length}</b>
        </div>
        <div className="panel flex items-center gap-2 px-3 py-1.5 text-xs">
          <Timer className="h-3.5 w-3.5 text-accent" />
          <span className="text-fog">하이퍼주기</span>
          <b className="font-mono text-snow">{hp}ms</b>
        </div>
        <div className="panel flex items-center gap-2 px-3 py-1.5 text-xs">
          <Gauge className="h-3.5 w-3.5 text-accent" />
          <span className="text-fog">추정 부하</span>
          <b
            className={`font-mono ${util > 0.7 ? "text-rose" : util > 0.4 ? "text-amberx" : "text-mint"}`}
          >
            {(util * 100).toFixed(1)}%
          </b>
        </div>
        <Segmented
          size="sm"
          value={String(window)}
          onChange={(v) => setWindowMs(Number(v))}
          options={[
            { value: "100", label: "100ms" },
            { value: "200", label: "200ms" },
            { value: "500", label: "500ms" },
          ]}
        />
      </div>

      {/* 간트 차트 */}
      <div className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-3 font-mono text-[9.5px] tracking-[0.2em] text-fog uppercase">
          Schedule Window · 0 ~ {window}ms
        </div>

        {/* 시간축 */}
        <div className="flex border-b border-line/60 bg-ink-900/40">
          <div className="w-[300px] shrink-0 border-r border-line px-4 py-2 font-mono text-[9px] text-fog">
            TASK (Prio / Period)
          </div>
          <div className="relative flex-1">
            <div className="flex justify-between px-1 py-2 font-mono text-[9px] text-fog/70">
              <span>0</span>
              <span>{window / 4}</span>
              <span>{window / 2}</span>
              <span>{(window / 4) * 3}</span>
              <span>{window}ms</span>
            </div>
          </div>
        </div>

        <div className="max-h-[430px] overflow-y-auto">
          {tasks.length === 0 && (
            <div className="px-6 py-10 text-center text-xs text-fog">
              타이밍 이벤트 Runnable이 없습니다. SWC 편집기에서 Timing Event를
              추가하세요.
            </div>
          )}
          {tasks.map((t, rowsIdx) => {
            const count = Math.ceil(window / t.period);
            const instances = Array.from({ length: count }, (_, k) => k * t.period);
            return (
              <div
                key={t.name}
                className="flex border-b border-line/40 last:border-0 hover:bg-ink-800/30"
              >
                <div className="flex w-[300px] shrink-0 items-center gap-2.5 border-r border-line px-4 py-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: t.color }}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] text-snow">
                      {t.name}
                    </div>
                    <div className="font-mono text-[9px] text-fog">
                      {t.swc} · P{t.order} · {t.period}ms
                    </div>
                  </div>
                </div>
                <div className="relative flex-1 overflow-hidden">
                  {/* 그리드 */}
                  <div className="absolute inset-0 flex justify-between">
                    {Array.from({ length: ticks }).map((_, i) => (
                      <div
                        key={i}
                        className="h-full w-px bg-line/40"
                        style={{ visibility: i === ticks - 1 ? "hidden" : "visible" }}
                      />
                    ))}
                  </div>
                  {/* 작업 인스턴스 바 */}
                  <div className="relative h-[46px]">
                    {instances.map((start, k) => (
                      <motion.div
                        key={k}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{
                          delay: rowsIdx * 0.04 + k * 0.012,
                          duration: 0.3,
                        }}
                        title={`${t.name} @${start}ms (WCET ${EXEC_MS}ms)`}
                        className="absolute top-1/2 h-4 -translate-y-1/2 origin-left rounded-sm"
                        style={{
                          left: `${(start / window) * 100}%`,
                          width: `max(${(EXEC_MS / window) * 100}%, 5px)`,
                          background: `linear-gradient(180deg, ${t.color}, ${t.color}88)`,
                          boxShadow: `0 0 10px ${t.color}44`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 스캔 플레이헤드 장식 */}
        <div className="relative h-1 overflow-hidden bg-ink-900">
          <div className="animate-dash absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        </div>
      </div>

      {/* 초기화 시퀀스 + 부하 분석 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <Play className="h-4 w-4 text-mint" />
            <span className="text-sm font-semibold text-snow">
              시작 시퀀스 (INIT-EVENT)
            </span>
            <span className="font-mono text-[10px] text-fog">
              t=0 부트스트랩
            </span>
          </div>
          {inits.length === 0 ? (
            <p className="text-xs text-fog">INIT-EVENT Runnable이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {inits.map((r, i) => (
                <div key={r.name} className="flex items-center gap-2">
                  <div className="rounded-lg border border-mint/30 bg-mint/8 px-3 py-1.5 font-mono text-[10.5px] text-mint">
                    {r.name}
                  </div>
                  {i < inits.length - 1 && (
                    <span className="text-fog/50">→</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 font-mono text-[9.5px] leading-relaxed text-fog/60">
            RTE가 INIT-EVENT를 순차 디스패치한 뒤 주기 태스크를 ARM 시킵니다.
          </p>
        </div>

        <div className="panel p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-snow">
              태스크별 부하 (하이퍼주기 {hp}ms 기준)
            </span>
          </div>
          <div className="space-y-2">
            {tasks.map((t) => {
              const runs = Math.ceil(hp / t.period);
              const u = (EXEC_MS * runs) / hp;
              return (
                <div key={t.name} className="flex items-center gap-2.5">
                  <span className="w-40 truncate font-mono text-[10px] text-mist">
                    {t.name}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(u * 100, 100)}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className="h-full rounded-full"
                      style={{ background: t.color }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-[10px] text-fog">
                    {(u * 100).toFixed(1)}%
                  </span>
                  <span className="w-16 text-right font-mono text-[9px] text-fog/60">
                    ×{runs}
                  </span>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <p className="text-xs text-fog">분석할 주기 태스크가 없습니다.</p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 font-mono text-[10px]">
            <Zap className="h-3 w-3 text-amberx" />
            <span className="text-fog">합계 CPU 부하</span>
            <b className="text-snow">{(util * 100).toFixed(1)}%</b>
          </div>
        </div>
      </div>
    </div>
  );
}
