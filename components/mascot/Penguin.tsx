import { cn } from "@/lib/utils";

export type PenguinMood = "happy" | "wave" | "chef" | "think" | "cheer" | "sleep";

/**
 * The MyPantryPal penguin. One reusable SVG with a few moods, so it looks the same everywhere.
 * Body colors are fixed brand colors; the stars use the theme's sun color.
 */
export function Penguin({ mood = "happy", size = 72, stars = true, className, label }: { mood?: PenguinMood; size?: number; stars?: boolean; className?: string; label?: string }) {
  const armUp = mood === "wave" || mood === "cheer";
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 100 110" className={cn("shrink-0 overflow-visible", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {stars && (
        <g fill="rgb(var(--sun))">
          <path className="animate-twinkle origin-center" style={{ transformBox: "fill-box" }} d="M8 18 C9 24 11 26 17 27 C11 28 9 30 8 36 C7 30 5 28 -1 27 C5 26 7 24 8 18 Z" />
          <path className="animate-twinkle origin-center" style={{ transformBox: "fill-box", animationDelay: "1.1s" }} d="M92 8 C92.7 12 94 13.3 98 14 C94 14.7 92.7 16 92 20 C91.3 16 90 14.7 86 14 C90 13.3 91.3 12 92 8 Z" />
          {mood === "cheer" && <path className="animate-twinkle origin-center" style={{ transformBox: "fill-box", animationDelay: ".6s" }} d="M88 58 C88.6 61 89.6 62 92.5 62.5 C89.6 63 88.6 64 88 67 C87.4 64 86.4 63 83.5 62.5 C86.4 62 87.4 61 88 58 Z" />}
        </g>
      )}
      <ellipse cx="34" cy="104" rx="11" ry="4.5" fill="#F2A33A" />
      <ellipse cx="66" cy="104" rx="11" ry="4.5" fill="#F2A33A" />
      {armUp ? (
        <ellipse cx="88" cy="40" rx="7" ry="17" fill="#1F2A30" transform="rotate(35 88 40)" />
      ) : (
        <ellipse cx="86" cy="66" rx="7.5" ry="19" fill="#1F2A30" transform="rotate(-18 86 66)" />
      )}
      <ellipse cx="14" cy="66" rx="7.5" ry="19" fill="#1F2A30" transform={mood === "cheer" ? "rotate(-35 14 50)" : "rotate(18 14 66)"} />
      <ellipse cx="50" cy="60" rx="37" ry="45" fill="#1F2A30" />
      <ellipse cx="50" cy="68" rx="26" ry="33" fill="#FFFFFF" />
      {mood === "sleep" ? (
        <g stroke="#1F2A30" strokeWidth="2.5" strokeLinecap="round"><path d="M35 42 q4 3 8 0" fill="none" /><path d="M57 42 q4 3 8 0" fill="none" /></g>
      ) : mood === "think" ? (
        <g fill="#1F2A30"><circle cx="40" cy="41" r="4.5" /><circle cx="61" cy="39" r="4.5" /><circle cx="41.5" cy="39.5" r="1.4" fill="#fff" /><circle cx="62.5" cy="37.5" r="1.4" fill="#fff" /></g>
      ) : (
        <g fill="#1F2A30"><circle cx="39" cy="41" r="4.5" /><circle cx="61" cy="41" r="4.5" /><circle cx="40.5" cy="39.5" r="1.4" fill="#fff" /><circle cx="62.5" cy="39.5" r="1.4" fill="#fff" /></g>
      )}
      <path d="M44 49 L56 49 L50 57 Z" fill="#F2A33A" />
      <ellipse cx="31" cy="52" rx="5" ry="3" fill="#F6B6B0" />
      <ellipse cx="69" cy="52" rx="5" ry="3" fill="#F6B6B0" />
      {mood === "chef" && (
        <g>
          <path d="M30 22 C24 22 22 12 30 10 C31 2 43 0 47 7 C51 0 63 2 63 10 C72 10 72 22 66 22 Z" fill="#FFFFFF" stroke="#D9E2DE" strokeWidth="1.5" />
          <rect x="31" y="19" width="35" height="8" rx="2" fill="#FFFFFF" stroke="#D9E2DE" strokeWidth="1.5" />
        </g>
      )}
      {mood === "think" && <g fill="#8BCFB0"><circle cx="82" cy="22" r="3" /><circle cx="90" cy="13" r="4.5" /></g>}
    </svg>
  );
}
