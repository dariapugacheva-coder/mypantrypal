"use client";
import { cn } from "@/lib/utils";

export interface BarDatum { label: string; value: number; secondary?: number; highlight?: boolean }

/** Simple vertical bar chart drawn to one scale, with an optional goal line. */
export function BarChart({ data, height = 180, goal, format = (v) => String(Math.round(v)), secondaryLabel, primaryLabel, ariaLabel }: {
  data: BarDatum[]; height?: number; goal?: number; format?: (v: number) => string; primaryLabel?: string; secondaryLabel?: string; ariaLabel: string;
}) {
  const max = Math.max(1, goal ?? 0, ...data.map((d) => Math.max(d.value, d.secondary ?? 0))) * 1.15;
  const ticks = [0, max / 2, max].map((t) => niceRound(t));
  const top = ticks[2];
  const y = (v: number) => height - (v / top) * height;
  const hasSecondary = data.some((d) => d.secondary !== undefined);
  return (
    <figure className="w-full" aria-label={ariaLabel}>
      <div className="relative flex gap-2" style={{ height: height + 24 }}>
        <div className="flex w-9 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-muted" style={{ height }}>
          {[...ticks].reverse().map((t, i) => <span key={i} className="-translate-y-1/2 leading-none">{format(t)}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 top-0" style={{ height }}>
            {ticks.map((t, i) => <div key={i} className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: y(t) }} />)}
            {goal !== undefined && goal > 0 && (
              <div className="absolute inset-x-0 z-10 border-t-2 border-sun" style={{ top: y(goal) }}>
                <span className="absolute -top-5 right-0 rounded bg-sun-soft px-1.5 text-[10px] font-semibold text-sun-ink">Goal {format(goal)}</span>
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 top-0 flex items-end justify-around gap-1.5" style={{ height }}>
            {data.map((d, i) => (
              <div key={i} className="group flex h-full min-w-0 flex-1 items-end justify-center gap-0.5">
                <div title={`${d.label}: ${format(d.value)}`} className={cn("w-full max-w-[28px] rounded-t-md transition-all duration-500", d.highlight ? "bg-mint-strong" : "bg-mint")} style={{ height: Math.max(2, (d.value / top) * height) }} />
                {hasSecondary && <div title={`${d.label}: ${format(d.secondary ?? 0)}`} className="w-full max-w-[28px] rounded-t-md bg-danger/80" style={{ height: Math.max(d.secondary ? 2 : 0, ((d.secondary ?? 0) / top) * height) }} />}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 flex justify-around gap-1.5" style={{ top: height + 6 }}>
            {data.map((d, i) => <span key={i} className="min-w-0 flex-1 truncate text-center text-[11px] text-muted">{d.label}</span>)}
          </div>
        </div>
      </div>
      {(primaryLabel || secondaryLabel) && (
        <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          {primaryLabel && <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-mint-strong" />{primaryLabel}</span>}
          {secondaryLabel && <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-danger/80" />{secondaryLabel}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function niceRound(v: number): number {
  if (v <= 0) return 0;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

const PIE_COLORS = ["rgb(var(--mint-strong))", "rgb(var(--sky-ink))", "rgb(var(--sun))", "rgb(var(--red))", "rgb(var(--mint))", "rgb(var(--muted))", "rgb(var(--sun-ink))", "rgb(var(--ink))"];

/** Horizontal share bars: easier to read than a pie for 3-8 categories. */
export function ShareBars({ data, format }: { data: { label: string; value: number }[]; format: (v: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d, i) => (
        <li key={d.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{d.label}</span>
            <span className="tabular-nums text-muted">{format(d.value)} <span className="text-xs">({Math.round((d.value / total) * 100)}%)</span></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ice"><div className="h-full rounded-full" style={{ width: `${(d.value / total) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} /></div>
        </li>
      ))}
    </ul>
  );
}
