"use client";
import { Clock, Flame, Heart, Sparkles } from "lucide-react";
import type { RankedRecipe } from "@/types/recipe";
import { Link } from "@/lib/nav";
import { RecipeCover } from "./RecipeCover";
import { Badge } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";

export function RecipeCard({ ranked, saved, currency = "USD", className }: { ranked: RankedRecipe; saved?: boolean; currency?: string; className?: string }) {
  const r = ranked.recipe;
  const all = ranked.available === ranked.required;
  return (
    <Link href={`/cook/${r.id}`} className={cn("group flex flex-col overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-lift", className)}>
      <div className="relative">
        <RecipeCover recipe={r} className="aspect-[16/9] w-full" rounded="rounded-none" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {ranked.expiringUsed.length > 0 && <Badge tone="danger">Uses {ranked.expiringUsed[0].toLowerCase()}</Badge>}
          {r.source === "ai" && <Badge tone="sky"><Sparkles className="h-3 w-3" />AI recipe</Badge>}
        </div>
        {saved && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-danger" aria-label="Saved"><Heart className="h-4 w-4 fill-current" /></span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-semibold text-ink group-hover:text-mint-ink">{r.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.preparation_time} min</span>
            <span>{r.difficulty}</span>
            <span>~{formatMoney(ranked.estimatedCost, currency)}</span>
          </p>
        </div>
        <dl className="grid grid-cols-4 gap-1 rounded-xl bg-ice p-2 text-center">
          {[["kcal", r.calories], ["protein", `${r.protein}g`], ["carbs", `${r.carbohydrates}g`], ["fat", `${r.fat}g`]].map(([k, v]) => (
            <div key={k as string}><dd className="text-sm font-bold tabular-nums text-ink">{v}</dd><dt className="text-[10px] uppercase tracking-wide text-muted">{k}</dt></div>
          ))}
        </dl>
        <p className={cn("mt-auto inline-flex items-center gap-1.5 text-xs font-medium", all ? "text-mint-ink" : "text-muted")}>
          <Flame className="h-3.5 w-3.5" />
          {all ? "You have every main ingredient" : `You have ${ranked.available} of ${ranked.required} ingredients`}
        </p>
      </div>
    </Link>
  );
}
