"use client";
/**
 * Hash-router replacement for lib/nav.tsx, used only by the single-file presentation build.
 * Hashes are plain names (#home, #recipe-egg-fried-rice) so they survive being shared as links.
 */
import { useEffect, useState, type ReactNode, type MouseEventHandler, type CSSProperties } from "react";

export interface LinkProps { href: string; className?: string; children?: ReactNode; onClick?: MouseEventHandler<HTMLAnchorElement>; style?: CSSProperties; "aria-label"?: string; "aria-current"?: "page" | undefined; title?: string }

export function pathToHash(path: string): string {
  if (path === "/" || path === "") return "";
  if (path.startsWith("/cook/")) return `recipe-${path.slice(6)}`;
  if (path === "/settings") return "preferences";
  return path.replace(/^\//, "");
}

export function hashToPath(hash: string): string {
  const h = hash.replace(/^#/, "");
  if (!h) return "/";
  if (h.startsWith("recipe-")) return `/cook/${h.slice(7)}`;
  if (h === "preferences") return "/settings";
  return `/${h}`;
}

const current = () => { try { return hashToPath(window.location.hash); } catch { return "/"; } };

function go(path: string, replace: boolean) {
  const hash = pathToHash(path);
  try {
    if (replace) history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname + window.location.search);
    else if (hash) window.location.hash = hash;
    window.dispatchEvent(new Event("mpp:navigate"));
  } catch { /* ignore */ }
  window.scrollTo?.(0, 0);
}

export function Link({ href, onClick, ...rest }: LinkProps) {
  return <a href={`#${pathToHash(href)}`} onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) { e.preventDefault(); go(href, false); } }} {...rest} />;
}

const nav = { push: (h: string) => go(h, false), replace: (h: string) => go(h, true), back: () => history.back() };
export function useNav() { return nav; }

export function usePath(): string {
  const [p, setP] = useState(current);
  useEffect(() => {
    const on = () => setP(current());
    window.addEventListener("hashchange", on);
    window.addEventListener("mpp:navigate", on);
    return () => { window.removeEventListener("hashchange", on); window.removeEventListener("mpp:navigate", on); };
  }, []);
  return p;
}

export function useRouteParam(name: string): string | null {
  const p = usePath();
  if (name === "id" && p.startsWith("/cook/")) return decodeURIComponent(p.slice(6));
  return null;
}
