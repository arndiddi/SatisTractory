import type { MeasureResult } from "@/lib/health";
import { cn } from "@/lib/utils";

const STYLES = {
  worse: { text: "text-worse", bg: "bg-worse", soft: "bg-worse-soft", label: "Worse than state", arrow: "▲" },
  better: { text: "text-better", bg: "bg-better", soft: "bg-better-soft", label: "Better than state", arrow: "▼" },
  similar: { text: "text-similar", bg: "bg-similar", soft: "bg-similar-soft", label: "Similar to state", arrow: "●" },
} as const;

export function MeasureCard({ m, scaleMax }: { m: MeasureResult; scaleMax: number }) {
  const s = STYLES[m.comparison ?? "similar"];
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / scaleMax) * 100))}%`;
  const arrow = m.comparison === "similar" ? "●" : m.stateAvg != null && m.value > m.stateAvg ? "▲" : "▼";
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-medium leading-snug text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{m.label}</h4>
        {m.comparison && (
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.soft, s.text)}>
            <span aria-hidden>{arrow}</span>
            {s.label.split(" ")[0]}
          </span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">{m.value.toFixed(1)}%</span>
        {m.stateAvg != null && (
          <span className="text-sm text-muted-foreground">state {m.stateAvg.toFixed(1)}%</span>
        )}
      </p>
      <div
        className="relative mt-4 h-3"
        role="img"
        aria-label={`Tract ${m.value}% (range ${m.low}–${m.high}%)${m.stateAvg != null ? `, state average ${m.stateAvg}%. ${s.label}.` : ""}`}
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" />
        <div className={cn("absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full opacity-80", s.bg)} style={{ width: pct(m.value) }} />
        {/* confidence interval */}
        <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/70" style={{ left: pct(m.low), width: `calc(${pct(m.high)} - ${pct(m.low)})` }} />
        <div className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-foreground/70" style={{ left: pct(m.low) }} />
        <div className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-foreground/70" style={{ left: pct(m.high) }} />
        {m.stateAvg != null && (
          <div className="absolute -top-1 h-5 w-0.5 rounded bg-foreground" style={{ left: pct(m.stateAvg) }} />
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        Likely range {m.low.toFixed(1)}–{m.high.toFixed(1)}% · <span aria-hidden>│</span> state average
      </p>
    </article>
  );
}
