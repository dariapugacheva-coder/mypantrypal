import type { Recipe } from "@/types/recipe";
import { cn } from "@/lib/utils";

/**
 * Illustrated recipe cover: a plate seen from above with the recipe's colors.
 * Drawn in SVG so every recipe (including AI ones) gets a consistent picture without stock photos.
 */
export function RecipeCover({ recipe, className, rounded = "rounded-2xl" }: { recipe: Recipe; className?: string; rounded?: string }) {
  const [a, b] = recipe.palette;
  const seed = [...recipe.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const dots = Array.from({ length: 9 }, (_, i) => {
    const ang = ((seed * (i + 3)) % 360) * (Math.PI / 180);
    const r = 14 + ((seed * (i + 7)) % 18);
    return { x: 100 + Math.cos(ang) * r, y: 62 + Math.sin(ang) * r * 0.8, s: 4 + ((seed + i * 5) % 6), c: i % 3 === 0 ? b : i % 3 === 1 ? a : "#FFFFFF" };
  });
  return (
    <div className={cn("relative overflow-hidden bg-ice", rounded, className)} aria-hidden>
      <svg viewBox="0 0 200 124" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <rect width="200" height="124" fill={b} opacity="0.22" />
        <circle cx="30" cy="20" r="26" fill={a} opacity="0.18" />
        <circle cx="178" cy="108" r="34" fill={b} opacity="0.2" />
        <ellipse cx="100" cy="66" rx="52" ry="44" fill="#000" opacity="0.06" />
        <ellipse cx="100" cy="62" rx="52" ry="44" fill="#FFFFFF" />
        <ellipse cx="100" cy="62" rx="40" ry="33" fill="#F7F9F8" stroke="#E6ECE9" strokeWidth="1.5" />
        <ellipse cx="100" cy="62" rx="30" ry="24" fill={a} opacity="0.9" />
        {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.s} fill={d.c} opacity={0.95} />)}
        <path d="M100 52 c6 -8 16 -6 14 2 c-2 6 -10 8 -14 4 Z" fill={b} />
        <rect x="160" y="22" width="5" height="70" rx="2.5" fill="#FFFFFF" opacity="0.9" />
        <rect x="35" y="22" width="5" height="70" rx="2.5" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  );
}
