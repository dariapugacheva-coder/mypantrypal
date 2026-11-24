"use client";
import type { ReactNode } from "react";
import { Bell, ChefHat, HelpCircle, Home, LineChart, Refrigerator, Settings, ShoppingBasket, UserRound } from "lucide-react";
import { Link, usePath } from "@/lib/nav";
import { useData } from "@/lib/data/DataProvider";
import { buildNotifications } from "@/lib/analytics/notifications";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Brand, Credits } from "./Brand";
import { DemoTag } from "@/components/ui";

export const MAIN_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/fridge", label: "My Fridge", short: "Fridge", icon: Refrigerator },
  { href: "/cook", label: "Cook", icon: ChefHat },
  { href: "/shop", label: "Shop & Budget", short: "Shop", icon: ShoppingBasket },
  { href: "/progress", label: "Progress", icon: LineChart }
];

const SECONDARY_NAV = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & About", icon: HelpCircle }
];

const isActive = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  return <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-mint text-sm font-semibold text-mint-on" style={{ width: size, height: size }} aria-hidden>{initials}</span>;
}

export function NotificationBell() {
  const { data } = useData();
  const now = useNow();
  const count = data ? buildNotifications(data, now).filter((n) => n.tone === "danger" || n.tone === "warning").length : 0;
  return (
    <Link href="/notifications" aria-label={count ? `Notifications, ${count} need attention` : "Notifications"} className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-ice hover:text-ink">
      <Bell className="h-5 w-5" />
      {count > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{count}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePath();
  const { data, mode } = useData();
  const name = data?.profile.full_name || "You";
  return (
    <div className="min-h-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface md:flex" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/home" aria-label="MyPantryPal home"><Brand /></Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3" aria-label="Main">
          {MAIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-mint text-mint-on shadow-sm" : "text-muted hover:bg-ice hover:text-ink")}>
                <Icon className="h-5 w-5" />{label}
              </Link>
            );
          })}
          <div className="my-3 border-t border-line" />
          {SECONDARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition", active ? "bg-mint-soft font-medium text-mint-ink" : "text-muted hover:bg-ice hover:text-ink")}>
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
          <Link href="/profile" className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-ice">
            <Avatar name={name} />
            <span className="min-w-0">
              <span className="flex items-center gap-2 truncate text-sm font-medium text-ink">{name}{mode === "demo" && <DemoTag />}</span>
              <span className="block truncate text-xs text-muted">{data?.profile.email}</span>
            </span>
          </Link>
          <Credits />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky z-30 flex items-center justify-between border-b border-line bg-surface/95 py-2 backdrop-blur md:hidden gutter" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <Link href="/home" aria-label="MyPantryPal home"><Brand size={30} /></Link>
        <div className="flex items-center gap-1">
          {mode === "demo" && <DemoTag />}
          <NotificationBell />
          <Link href="/profile" aria-label="Profile"><Avatar name={name} size={34} /></Link>
        </div>
      </header>

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl gutter pb-32 pt-5 md:pb-12 md:pt-8 md:px-8">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
        <ul className="grid grid-cols-5">
          {MAIN_NAV.map(({ href, label, short, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition", active ? "text-mint-ink" : "text-muted")}>
                  <span className={cn("flex h-8 w-12 items-center justify-center rounded-full transition", active && "bg-mint text-mint-on")}><Icon className="h-5 w-5" /></span>
                  {short ?? label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
