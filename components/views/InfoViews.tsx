"use client";
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, Info, Pill } from "lucide-react";
import { useAppData } from "@/lib/data/DataProvider";
import { buildNotifications } from "@/lib/analytics/notifications";
import { useIntegrations, useNow } from "@/lib/hooks";
import { Link } from "@/lib/nav";
import { APP_NAME, COPYRIGHT, CREATOR } from "@/lib/config";
import { cn, toDateKey } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { Penguin } from "@/components/mascot/Penguin";

export function NotificationsView() {
  const { data, actions } = useAppData();
  const now = useNow();
  const list = buildNotifications(data, now);
  const icon = { danger: AlertTriangle, warning: AlertTriangle, info: Info, success: CheckCircle2 };
  const tint = { danger: "bg-danger-soft text-danger-ink", warning: "bg-sun-soft text-sun-ink", info: "bg-sky-soft text-sky-ink", success: "bg-mint-soft text-mint-ink" };
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Updated from your fridge, budget and reminders." action={<Link href="/settings" className="text-sm font-medium text-mint-ink hover:underline">Notification settings</Link>} />
      {list.length === 0 ? <EmptyState art={<Penguin mood="sleep" size={90} />} title="All caught up" body="No alerts right now. I'll tell you when food is about to expire or your budget needs attention." /> : (
        <ul className="flex max-w-3xl flex-col gap-3">
          {list.map((n) => {
            const Icon = n.kind === "vitamins" ? Pill : n.kind === "weekly_report" ? Bell : icon[n.tone];
            const reminderId = n.kind === "vitamins" ? n.id.replace(/^rem-/, "") : null;
            const rem = reminderId ? data.reminders.find((r) => r.id === reminderId) : null;
            return (
              <li key={n.id} className="flex items-start gap-3 rounded-2xl border border-line/60 bg-surface p-4 shadow-card">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tint[n.tone])}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-medium">{n.title}</p><p className="text-sm text-muted">{n.body}</p></div>
                {rem && rem.last_done_on !== toDateKey() ? <Button size="sm" variant="soft" onClick={() => void actions.markReminderDone(rem.id)}>Taken</Button> : <Link href={n.href} aria-label={`Open: ${n.title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-ice hover:text-ink"><ArrowRight className="h-4 w-4" /></Link>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const FAQ: [string, string][] = [
  ["How does fridge scanning work?", "Take or upload a photo. When AI recognition is connected, it suggests the products it sees with a confidence level, and asks you when it's unsure (for example, milk or yogurt). You always review the list before anything is saved."],
  ["Are expiration dates exact?", "No. A photo can't show the date printed on a package, so MyPantryPal estimates dates from the food type and where it's stored. Change any date to the one on the package."],
  ["How are recipes chosen?", "Recipes are ranked by how many ingredients you already have, which items expire soon, your protein goal, cooking time and your ratings. Recipes with your allergens are never shown."],
  ["Are the coupons real?", "Not yet. Coupons marked DEMO come from fictional stores to show how the feature will work. Real offers will appear only after a store partnership is connected."],
  ["Does MyPantryPal give medical advice?", "No. Nutrition values are estimates for everyday tracking, and vitamin reminders only remind you about what you added yourself."]
];

export function HelpView() {
  const integrations = useIntegrations();
  const rows: [string, boolean | undefined, string][] = [
    ["AI fridge recognition", integrations?.vision, "Manual list entry"],
    ["Receipt reading (OCR)", integrations?.ocr, "Paste or type receipt lines"],
    ["AI recipes and tips", integrations?.ai_text, "Built-in recipe library and tips"],
    ["USDA nutrition data", integrations?.usda, "Built-in nutrition table"],
    ["Store coupons and prices", integrations?.grocery, "Demo coupons and sample prices"],
    ["Cloud accounts (Supabase)", integrations?.supabase, "Accounts saved in this browser"]
  ];
  return (
    <div>
      <PageHeader title="Help & About" subtitle="How MyPantryPal works." art={<Penguin mood="wave" size={56} className="hidden sm:block" />} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Frequently asked questions" />
          <div className="flex flex-col divide-y divide-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">{q}<ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-90" /></summary>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </Card>
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Connected services" subtitle="What runs live in this version, and what's used instead" />
            <ul className="flex flex-col gap-2">
              {rows.map(([name, on, fallback]) => (
                <li key={name} className="flex items-start justify-between gap-3 rounded-xl bg-ice px-3 py-2.5 text-sm">
                  <div><p className="font-medium">{name}</p>{!on && <p className="text-xs text-muted">Using: {fallback}</p>}</div>
                  {integrations === null ? <Badge>Checking…</Badge> : on ? <Badge tone="mint">Connected</Badge> : <Badge tone="warning">Demo mode</Badge>}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="flex flex-col items-center gap-3 text-center">
            <Penguin mood="happy" size={90} />
            <h2 className="text-xl font-semibold">{APP_NAME}</h2>
            <p className="max-w-sm text-sm text-muted">A smart kitchen assistant that helps you know what food you have, use it before it expires, cook with what you own and stay on budget.</p>
            <p className="text-sm">Created by: <b>{CREATOR}</b></p>
            <p className="text-xs text-muted">{COPYRIGHT}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
