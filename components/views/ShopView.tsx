"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bookmark, BookmarkCheck, Lightbulb, Pencil, Plus, Receipt, Store, Tag, Trash2, Wallet } from "lucide-react";
import type { ShoppingItem } from "@/types/database";
import { SHOPPING_CATEGORIES, UNITS, type ShoppingCategory } from "@/types/product";
import { useAppData, type ShoppingInput } from "@/lib/data/DataProvider";
import { budgetInsights, budgetStatus, expiringSoon, spendingByCategory, weeklySpendingSeries, averageWeeklySpending } from "@/lib/analytics";
import { useIntegrations } from "@/lib/hooks";
import { takeIntent } from "@/lib/intent";
import { CHEAPER_ALTERNATIVES, SAMPLE_PRICES } from "@/lib/demo/coupons";
import { guessCategory, productKey, toShoppingCategory, relatedProduct } from "@/lib/etl/normalize";
import { useRankedRecipes } from "@/lib/recipes/useRecipes";
import { matchIngredient } from "@/lib/recipes/engine";
import { addDays, cn, daysUntil, formatDate, formatMoney, startOfMonth } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, ConfirmDialog, DemoTag, EmptyState, ErrorNote, Field, InfoNote, Input, Modal, PageHeader, ProgressBar, Select } from "@/components/ui";
import { BarChart, ShareBars } from "@/components/ui/charts";
import { Penguin } from "@/components/mascot/Penguin";
import { ReceiptFlow } from "@/components/shop/ReceiptFlow";

/* ---------------- budget ---------------- */

function BudgetCard() {
  const { data, actions } = useAppData();
  const [editing, setEditing] = useState(false);
  const [weekly, setWeekly] = useState("");
  const [monthly, setMonthly] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const b = budgetStatus(data);
  const cur = data.profile.currency;
  const level = Math.max(b.levelWeek, b.levelMonth);
  const tone = level >= 100 ? "danger" : level >= 75 ? "warning" : "mint";
  const message = b.levelWeek >= 100 ? "You have reached your weekly grocery budget." : b.levelWeek >= 90 ? `You have used ${Math.round(b.pctWeek * 100)}% of your weekly budget. Only ${formatMoney(b.remainingWeek, cur)} left.` : b.levelWeek >= 75 ? `You have used ${Math.round(b.pctWeek * 100)}% of your weekly budget.` : null;

  const save = async () => {
    const w = Number(weekly), m = Number(monthly);
    if (!(w > 0) || !(m > 0)) { setErr("Both budgets must be more than 0."); return; }
    if (m < w) { setErr("The monthly budget is usually larger than the weekly one."); return; }
    if (await actions.updatePreferences({ budget_settings: { weekly: w, monthly: m } }, "Budget updated")) setEditing(false);
  };

  return (
    <Card>
      <CardHeader icon={<Wallet className="h-5 w-5" />} title="Grocery budget" subtitle={b.onTrack ? "You're on track this week" : `At this pace: ~${formatMoney(b.projectedWeek, cur)} this week`}
        action={<Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => { setWeekly(String(b.weekly)); setMonthly(String(b.monthly)); setErr(null); setEditing(true); }}>Edit</Button>} />
      {message && <div className={cn("mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm", level >= 100 ? "bg-danger-soft text-danger-ink" : "bg-sun-soft text-sun-ink")} role="status"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
      <div className="grid gap-5 sm:grid-cols-2">
        {[
          { label: "This week", spent: b.spentWeek, limit: b.weekly, left: b.remainingWeek, pct: b.pctWeek },
          { label: "This month", spent: b.spentMonth, limit: b.monthly, left: b.remainingMonth, pct: b.pctMonth }
        ].map((x) => (
          <div key={x.label}>
            <div className="mb-2 flex items-baseline justify-between"><span className="text-sm text-muted">{x.label}</span><span className="text-xs text-muted">{Math.round(x.pct * 100)}%</span></div>
            <p className="mb-2"><span className="text-2xl font-bold tabular-nums">{formatMoney(x.spent, cur)}</span> <span className="text-sm text-muted">of {formatMoney(x.limit, cur)}</span></p>
            <ProgressBar value={x.spent} max={x.limit} tone={x.pct >= 1 ? "danger" : x.pct >= 0.75 ? "warning" : "mint"} label={`${x.label} budget used`} />
            <p className={cn("mt-1.5 text-xs", x.left < 0 ? "text-danger-ink" : "text-muted")}>{x.left >= 0 ? `${formatMoney(x.left, cur)} left` : `${formatMoney(-x.left, cur)} over`}</p>
          </div>
        ))}
      </div>
      <span className="sr-only">Budget status: {tone}</span>
      <Modal open={editing} onClose={() => setEditing(false)} size="sm" title="Edit budget" footer={<><Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={() => void save()}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          {err && <ErrorNote>{err}</ErrorNote>}
          <Field label={`Weekly budget (${cur})`} htmlFor="bw"><Input id="bw" type="number" min="1" step="1" value={weekly} onChange={(e) => setWeekly(e.target.value)} /></Field>
          <Field label={`Monthly budget (${cur})`} htmlFor="bm"><Input id="bm" type="number" min="1" step="1" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></Field>
          <p className="text-xs text-muted">You'll get a warning at 75%, 90% and 100% of your budget.</p>
        </div>
      </Modal>
    </Card>
  );
}

/* ---------------- shopping list ---------------- */

const blankItem = () => ({ name: "", quantity: "1", unit: "pcs", category: "Other" as ShoppingCategory });

function ShoppingListCard() {
  const { data, actions } = useAppData();
  const [form, setForm] = useState(blankItem());
  const [catTouched, setCatTouched] = useState(false);
  const [dup, setDup] = useState<{ input: ShoppingInput; fridge: string | null; listItem: ShoppingItem | null } | null>(null);
  const [changeQty, setChangeQty] = useState("");
  const [clearing, setClearing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cur = data.profile.currency;
  const items = data.shopping_items;
  const open = items.filter((i) => !i.purchased);
  const done = items.filter((i) => i.purchased);
  const estimate = open.reduce((s, i) => s + (i.estimated_price ?? SAMPLE_PRICES[productKey(i.product_name)] ?? 0) * (["g", "ml"].includes(i.unit) ? 1 : i.quantity), 0);
  const grouped = SHOPPING_CATEGORIES.map((c) => ({ c, rows: open.filter((i) => i.category === c) })).filter((g) => g.rows.length);

  const submit = async () => {
    const name = form.name.trim();
    const q = Number(form.quantity);
    if (!name) { setErr("Enter an item name."); return; }
    if (!(q > 0)) { setErr("Quantity must be more than 0."); return; }
    setErr(null);
    const input: ShoppingInput = { product_name: name, category: form.category, quantity: q, unit: form.unit, estimated_price: SAMPLE_PRICES[productKey(name)] ?? null };
    const d = actions.findDuplicate(name);
    if (d.inFridge || d.inList) {
      setChangeQty(form.quantity);
      setDup({ input, fridge: d.inFridge ? `${d.inFridge.quantity} ${d.inFridge.unit}${d.inFridge.expiration_date ? `, ${(daysUntil(d.inFridge.expiration_date) ?? 0) < 0 ? "expired" : `good until ${formatDate(d.inFridge.expiration_date)}`}` : ""}` : null, listItem: d.inList });
      return;
    }
    if (await actions.addShoppingItem(input)) { setForm(blankItem()); setCatTouched(false); }
  };

  const keep = async (qty?: number) => {
    if (!dup) return;
    const ok = dup.listItem && qty !== undefined
      ? await actions.updateShoppingItem(dup.listItem.id, { quantity: qty })
      : await actions.addShoppingItem({ ...dup.input, quantity: qty ?? dup.input.quantity });
    if (ok) { setForm(blankItem()); setCatTouched(false); }
    setDup(null);
  };

  const dupName = dup?.input.product_name.toLowerCase() ?? "";

  return (
    <Card>
      <CardHeader icon={<Store className="h-5 w-5" />} title="Shopping list" subtitle={open.length ? `${open.length} item${open.length === 1 ? "" : "s"} · about ${formatMoney(estimate, cur)} (sample prices)` : "Nothing to buy yet"}
        action={done.length ? <Button size="sm" variant="ghost" onClick={() => setClearing(true)}>Clear purchased</Button> : undefined} />
      <form className="mb-4 grid grid-cols-[1fr_4.5rem] gap-2 sm:grid-cols-[1fr_4.5rem_6rem_8rem_auto]" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        <Input aria-label="Item name" placeholder="Add an item, e.g. eggs" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, category: catTouched ? f.category : toShoppingCategory(guessCategory(e.target.value)) }))} />
        <Input aria-label="Quantity" type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
        <Select aria-label="Unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select>
        <Select aria-label="Category" value={form.category} onChange={(e) => { setCatTouched(true); setForm((f) => ({ ...f, category: e.target.value as ShoppingCategory })); }}>{SHOPPING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
        <Button type="submit" icon={<Plus className="h-4 w-4" />} className="col-span-2 sm:col-span-1">Add</Button>
      </form>
      {err && <div className="mb-3"><ErrorNote>{err}</ErrorNote></div>}
      {items.length === 0 ? (
        <EmptyState art={<Penguin mood="happy" size={64} stars={false} />} title="Your list is empty" body="Add items above, or add missing ingredients from any recipe." />
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(({ c, rows }) => (
            <div key={c}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{c}</p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {rows.map((i) => <ListRow key={i.id} item={i} />)}
              </ul>
            </div>
          ))}
          {done.length > 0 && (
            <details className="rounded-xl bg-ice px-3 py-2">
              <summary className="cursor-pointer text-sm text-muted">Purchased ({done.length})</summary>
              <ul className="mt-2 divide-y divide-line">{done.map((i) => <ListRow key={i.id} item={i} />)}</ul>
            </details>
          )}
        </div>
      )}
      <Modal open={Boolean(dup)} onClose={() => setDup(null)} size="sm" title="Already have it?"
        footer={<><Button variant="secondary" onClick={() => setDup(null)}>Cancel</Button><Button variant="secondary" onClick={() => void keep(Number(changeQty) || dup?.input.quantity)}>Change quantity</Button><Button onClick={() => void keep()}>Keep anyway</Button></>}>
        {dup && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Penguin mood="think" size={52} stars={false} />
              <div className="text-sm">
                {dup.fridge && <p className="font-medium text-ink">You already have {dupName} in your fridge!</p>}
                {dup.fridge && <p className="text-muted">{dup.fridge}</p>}
                {dup.listItem && <p className={cn("text-muted", dup.fridge && "mt-1")}>{dup.listItem.product_name} is already on your list ({dup.listItem.quantity} {dup.listItem.unit}).</p>}
              </div>
            </div>
            <Field label={dup.listItem ? "New quantity on your list" : "Quantity to add"} htmlFor="dupq"><Input id="dupq" type="number" min="0" step="any" value={changeQty} onChange={(e) => setChangeQty(e.target.value)} /></Field>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={clearing} title="Clear purchased items?" message="Checked items will be removed from the list. Your spending history is not affected." confirmLabel="Clear" onCancel={() => setClearing(false)} onConfirm={async () => { await actions.clearPurchased(); setClearing(false); }} />
    </Card>
  );
}

function ListRow({ item }: { item: ShoppingItem }) {
  const { data, actions } = useAppData();
  const price = item.estimated_price ?? SAMPLE_PRICES[productKey(item.product_name)];
  const alt = CHEAPER_ALTERNATIVES[productKey(item.product_name)];
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <input type="checkbox" aria-label={`Mark ${item.product_name} as purchased`} className="h-5 w-5 shrink-0 accent-[rgb(var(--mint-strong))]" checked={item.purchased} onChange={(e) => void actions.updateShoppingItem(item.id, { purchased: e.target.checked })} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", item.purchased && "text-muted line-through")}>{item.product_name} <span className="font-normal text-muted">· {item.quantity} {item.unit}</span></p>
        {!item.purchased && alt && <p className="text-xs text-mint-ink">Cheaper option: {alt.name}, save ~{formatMoney(alt.save, data.profile.currency)} (estimate)</p>}
        {item.source === "recipe" && <p className="text-xs text-muted">From a recipe</p>}
      </div>
      {price ? <span className="text-xs tabular-nums text-muted">~{formatMoney(price * (["g", "ml"].includes(item.unit) ? 1 : item.quantity), data.profile.currency)}</span> : null}
      <Button size="sm" variant="ghost" aria-label={`Remove ${item.product_name}`} onClick={() => void actions.removeShoppingItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
    </li>
  );
}

/* ---------------- suggestions ---------------- */

function SuggestionsCard() {
  const { data, actions } = useAppData();
  const ranked = useRankedRecipes(data).slice(0, 4);
  const onList = (key: string) => data.shopping_items.some((i) => !i.purchased && relatedProduct(i.product_name, key));
  const suggestions = useMemo(() => {
    const out = new Map<string, { name: string; key: string; reason: string; category: ShoppingCategory }>();
    for (const r of ranked) for (const ing of r.recipe.ingredients) {
      if (ing.optional || out.has(ing.key) || onList(ing.key)) continue;
      if (matchIngredient(ing.key, data.products).state === "missing") out.set(ing.key, { name: ing.name, key: ing.key, reason: `For ${r.recipe.name}`, category: toShoppingCategory(ing.category) });
    }
    const staples = ["egg", "milk", "rice", "banana"];
    for (const k of staples) {
      if (out.has(k) || onList(k)) continue;
      const hit = data.products.find((p) => p.quantity > 0 && productKey(p.name) === k);
      if (!hit) {
        const bought = data.transaction_items.filter((i) => productKey(i.product_name) === k).length;
        if (bought >= 1) out.set(k, { name: k.charAt(0).toUpperCase() + k.slice(1), key: k, reason: `You buy this often and it's not in your fridge`, category: toShoppingCategory(guessCategory(k)) });
      }
    }
    return [...out.values()].slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, data.products, data.shopping_items, data.transaction_items]);

  return (
    <Card>
      <CardHeader icon={<Lightbulb className="h-5 w-5" />} title="Smart suggestions" subtitle="Based on your recipes and buying habits" />
      {suggestions.length ? (
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => {
            const price = SAMPLE_PRICES[s.key];
            return (
              <li key={s.key} className="flex items-center gap-3 rounded-xl bg-ice px-3 py-2.5">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-muted">{s.reason}{price ? ` · ~${formatMoney(price, data.profile.currency)} (sample price)` : ""}</p></div>
                <Button size="sm" variant="soft" icon={<Plus className="h-4 w-4" />} onClick={() => void actions.addShoppingItem({ product_name: s.name, category: s.category, quantity: 1, unit: "pcs", estimated_price: price ?? null, source: "suggestion" })}>Add</Button>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted">No suggestions right now. Your fridge covers your top recipes.</p>}
    </Card>
  );
}

/* ---------------- coupons ---------------- */

function DealsCard() {
  const { data, actions } = useAppData();
  const integrations = useIntegrations();
  const saves = new Map(data.coupon_saves.map((s) => [s.coupon_id, s.status]));
  const coupons = [...data.coupons].filter((c) => (daysUntil(c.expiration_date) ?? 0) >= 0).sort((a, b) => {
    const rel = (n: string) => (data.shopping_items.some((i) => !i.purchased && relatedProduct(i.product_name, n)) ? 0 : 1);
    return rel(a.product_name) - rel(b.product_name);
  });
  const anyDemo = coupons.some((c) => c.is_demo);
  return (
    <Card>
      <CardHeader icon={<Tag className="h-5 w-5" />} title={<span className="inline-flex items-center gap-2">Deals Near You {anyDemo && <DemoTag />}</span>} subtitle={anyDemo ? "Demonstration coupons from fictional stores" : "From connected store partners"} />
      {anyDemo && <div className="mb-4"><InfoNote tone="sun">These are <b>demonstration coupons</b>, not real store offers{integrations?.grocery ? "" : ", because no grocery partner is connected"}. “Mark as used” only tracks it inside MyPantryPal.</InfoNote></div>}
      {coupons.length === 0 ? <p className="text-sm text-muted">No deals available right now.</p> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {coupons.map((c) => {
            const st = saves.get(c.id);
            const relevant = data.shopping_items.some((i) => !i.purchased && relatedProduct(i.product_name, c.product_name));
            return (
              <li key={c.id} className={cn("relative flex flex-col gap-2 rounded-2xl border border-dashed p-4", st === "used" ? "border-line opacity-60" : "border-mint-strong/60 bg-mint-soft/40")}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl font-bold text-mint-ink">{c.discount}</span>
                  {c.is_demo && <DemoTag />}
                </div>
                <p className="font-medium">{c.product_name}</p>
                <p className="text-xs text-muted">{c.store_name} · until {formatDate(c.expiration_date)}</p>
                <p className="text-xs text-muted">{c.description} {c.conditions}</p>
                {relevant && <Badge tone="mint" className="self-start">On your list</Badge>}
                <div className="mt-1 flex gap-2">
                  {st === "used" ? <Badge>Used in MyPantryPal</Badge> : (
                    <>
                      <Button size="sm" variant={st ? "secondary" : "soft"} icon={st ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} onClick={() => void (st ? actions.unsaveCoupon(c.id) : actions.saveCoupon(c.id))}>{st ? "Saved" : "Save"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void actions.markCouponUsed(c.id)}>Mark as used</Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- history & insights ---------------- */

function InsightsCard() {
  const { data, actions } = useAppData();
  const cur = data.profile.currency;
  const [del, setDel] = useState<string | null>(null);
  const series = weeklySpendingSeries(data.transactions, 6).map((s, i, a) => ({ label: s.label, value: s.amount, highlight: i === a.length - 1 }));
  const cats = spendingByCategory(data, startOfMonth(), addDays(new Date(), 1)).map((c) => ({ label: c.category, value: c.amount }));
  const insights = budgetInsights(data);
  const avg = averageWeeklySpending(data.transactions);
  const soon = expiringSoon(data.products, 2).length;
  const history = [...data.transactions].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)).slice(0, 8);
  return (
    <Card>
      <CardHeader icon={<Receipt className="h-5 w-5" />} title="Spending insights" subtitle={avg ? `You usually spend about ${formatMoney(avg, cur)} a week` : "Add purchases to see insights"} />
      {data.transactions.length === 0 ? <p className="text-sm text-muted">No purchases yet. Add a receipt to start tracking.</p> : (
        <div className="flex min-w-0 flex-col gap-6">
          <BarChart data={series} goal={data.preferences.budget_settings.weekly} format={(v) => formatMoney(v, cur)} primaryLabel="Spent" ariaLabel="Weekly spending for the last 6 weeks" />
          {cats.length > 0 && <div><p className="mb-2 text-sm font-medium">This month by category</p><ShareBars data={cats} format={(v) => formatMoney(v, cur)} /></div>}
          {(insights.length > 0 || soon > 0) && (
            <ul className="flex flex-col gap-2">
              {insights.map((t) => <li key={t} className="flex gap-2 rounded-xl bg-ice px-3 py-2.5 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-mint-strong" />{t}</li>)}
              {soon > 0 && <li className="flex gap-2 rounded-xl bg-ice px-3 py-2.5 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-mint-strong" />Use the {soon} item{soon === 1 ? "" : "s"} expiring soon before buying more of the same.</li>}
            </ul>
          )}
          <div>
            <p className="mb-2 text-sm font-medium">Recent purchases</p>
            <ul className="divide-y divide-line">
              {history.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{t.store_name}</p><p className="text-xs text-muted">{formatDate(t.purchase_date, { weekday: "short", month: "short", day: "numeric" })} · {data.transaction_items.filter((i) => i.transaction_id === t.id).length} items</p></div>
                  <span className="font-bold tabular-nums">{formatMoney(t.total_amount, cur)}</span>
                  <Button size="sm" variant="ghost" aria-label={`Delete purchase at ${t.store_name}`} onClick={() => setDel(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <ConfirmDialog open={Boolean(del)} danger title="Delete this purchase?" message="Its items and total will be removed from your spending history." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { if (del) await actions.deleteTransaction(del); setDel(null); }} />
    </Card>
  );
}

export function ShopView() {
  const integrations = useIntegrations();
  const [receipt, setReceipt] = useState(false);
  useEffect(() => { if (takeIntent("shop-receipt")) setReceipt(true); }, []);
  return (
    <div>
      <PageHeader title="Shop & Budget" subtitle="Plan what to buy, avoid duplicates and stay on budget." art={<Penguin mood="happy" size={56} className="hidden sm:block" />}
        action={<Button onClick={() => setReceipt(true)} icon={<Receipt className="h-4 w-4" />}>Add receipt</Button>} />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6"><BudgetCard /><ShoppingListCard /><DealsCard /></div>
        <div className="flex min-w-0 flex-col gap-6"><SuggestionsCard /><InsightsCard /></div>
      </div>
      <ReceiptFlow open={receipt} onClose={() => setReceipt(false)} ocrAvailable={Boolean(integrations?.ocr)} />
    </div>
  );
}
