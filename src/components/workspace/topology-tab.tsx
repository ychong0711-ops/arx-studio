"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
import type { FullProject } from "@/lib/types";

const TopologyFlow = dynamic(
  () =>
    import("@/components/workspace/topology-flow").then((m) => ({
      default: m.TopologyFlow,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-fog">
        <Spinner className="h-6 w-6" />
        <span className="font-mono text-xs tracking-[0.2em] uppercase">
          캔버스 초기화 중…
        </span>
      </div>
    ),
  },
);

export function TopologyTab({ full }: { full: FullProject }) {
  return <TopologyFlow full={full} />;
}
