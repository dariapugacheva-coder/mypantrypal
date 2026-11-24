"use client";
/**
 * Navigation wrapper. The Next.js app uses the App Router; the single-file
 * presentation build swaps this module for demo/nav.tsx (hash routing).
 */
import NextLink from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode, MouseEventHandler, CSSProperties } from "react";

export interface LinkProps {
  href: string;
  className?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
  title?: string;
}

export function Link(props: LinkProps) {
  return <NextLink {...props} />;
}

export function useNav() {
  const router = useRouter();
  return { push: (href: string) => router.push(href), replace: (href: string) => router.replace(href), back: () => router.back() };
}

export function usePath(): string {
  return usePathname() ?? "/";
}

export function useRouteParam(name: string): string | null {
  const params = useParams();
  const v = params?.[name];
  return (Array.isArray(v) ? v[0] : v) ?? null;
}
