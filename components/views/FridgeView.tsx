"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChefHat, Pencil, Plus, Search, Trash2, Upload, XCircle } from "lucide-react";
import type { Product } from "@/types/database";
import type { Category } from "@/types/product";
import { useAppData, type ProductInput } from "@/lib/data/DataProvider";
import { useNav } from "@/lib/nav";
import { expiryStatus, activeProducts } from "@/lib/analytics";
import { useIntegrations } from "@/lib/hooks";
import { setIntent, takeIntent } from "@/lib/intent";
import { productKey } from "@/lib/etl/normalize";
import { resizeImage, validateImageFile } from "@/lib/utils/image";
import { cn, daysUntil, formatDate, relativeDays } from "@/lib/utils";
import { Badge, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorNote, Field, Input, Modal, PageHeader, Select } from "@/components/ui";
import { FoodIcon } from "@/components/ui/food-icon";
import { Penguin } from "@/components/mascot/Penguin";
import { ProductForm } from "@/components/fridge/ProductForm";
import { ScanFlow } from "@/components/fridge/ScanFlow";

const FILTERS: { id: string; label: string; test: (p: Product) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "soon", label: "Expiring Soon", test: (p) => ["urgent", "soon"].includes(expiryStatus(p)) },
  { id: "expired", label: "Expired", test: (p) => expiryStatus(p) === "expired" },
  { id: "fruits", label: "Fruits", test: (p) => p.category === "Fruits" },
  { id: "veg", label: "Vegetables", test: (p) => p.category === "Vegetables" },
  { id: "dairy", label: "Dairy", test: (p) => p.category === "Dairy" || p.category === "Eggs" },
  { id: "meat", label: "Meat", test: (p) => p.category === "Meat" || p.category === "Seafood" },
  { id: "frozen", label: "Frozen", test: (p) => p.storage_location === "Freezer" || p.category === "Frozen Food" },
  { id: "pantry", label: "Pantry", test: (p) => p.storage_location === "Pantry" }
];

const WASTE_REASONS = ["Expired", "Spoiled", "Forgot about it", "Bought too much", "Didn't like it", "Other"];

function ExpiryBadge({ p }: { p: Product }) {
  const s = expiryStatus(p);
  const d = daysUntil(p.expiration_date);
  if (s === "unknown") return <Badge>No date</Badge>;
  const tone = s === "expired" || s === "urgent" ? "danger" : s === "soon" ? "warning" : "mint";
  return <Badge tone={tone}>{relativeDays(d)}</Badge>;
}

function AmountDialog({ product, mode, onClose }: { product: Product | null; mode: "use" | "discard"; onClose: () => void }) {
  const { actions } = useAppData();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(WASTE_REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (product) { setAmount(String(product.quantity)); setReason(expiryStatus(product) === "expired" ? "Expired" : WASTE_REASONS[1]); setError(null); } }, [product]);
  if (!product) return null;
  const submit = async () => {
    const n = Number(amount);
    if (!(n > 0) || n > product.quantity) { setError(`Enter an amount between 0 and ${product.quantity} ${product.unit}.`); return; }
    setBusy(true);
    const ok = mode === "use" ? await actions.markUsed(product.id, n) : await actions.discardProduct(product.id, n, reason);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal open onClose={onClose} size="sm" title={mode === "use" ? `Mark ${product.name} as used` : `Discard ${product.name}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={mode === "use" ? "primary" : "danger"} loading={busy} onClick={() => void submit()}>{mode === "use" ? "Mark as used" : "Record as discarded"}</Button></>}>
      <div className="flex flex-col gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label={`How much? (you have ${product.quantity} ${product.unit})`} htmlFor="amt"><Input id="amt" type="number" min="0" step="any" max={product.quantity} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        {mode === "discard" && <Field label="Why is it being thrown away?" htmlFor="reason"><Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>{WASTE_REASONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>}
        <p className="text-xs text-muted">{mode === "use" ? "Using food before it expires counts toward your money saved." : "This helps MyPantryPal show where food and money are lost, so you can buy smarter next time."}</p>
      </div>
    </Modal>
  );
}

export function FridgeView() {
  const { data, actions } = useAppData();
  const nav = useNav();
  const integrations = useIntegrations();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"expiry" | "name" | "added">("expiry");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [amountFor, setAmountFor] = useState<{ p: Product; mode: "use" | "discard" } | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [dup, setDup] = useState<{ input: ProductInput; existing: Product } | null>(null);
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (takeIntent("fridge-add")) { setEditing(null); setFormOpen(true); }
    if (takeIntent("fridge-scan")) uploadRef.current?.click();
  }, []);

  const onPhoto = async (file?: File) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setPhotoError(err); return; }
    setPhotoError(null);
    try {
      setScanImage(await resizeImage(file, 1280, 0.82));
      setScanOpen(true);
    } catch {
      setPhotoError("This image could not be opened. Try a different photo.");
    }
  };

  const items = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    const list = activeProducts(data.products).filter((p) => f.test(p) && (!q || `${p.name} ${p.category} ${p.storage_location}`.toLowerCase().includes(q)));
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "added") return b.created_at.localeCompare(a.created_at);
      return (a.expiration_date ?? "9999").localeCompare(b.expiration_date ?? "9999");
    });
  }, [data.products, filter, query, sort]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, activeProducts(data.products).filter(f.test).length])), [data.products]);

  const submitManual = async (input: ProductInput): Promise<boolean> => {
    if (editing) return actions.updateProduct(editing.id, { ...input, purchase_date: input.purchase_date ?? editing.purchase_date });
    const { inFridge } = actions.findDuplicate(input.name);
    if (inFridge) { setDup({ input, existing: inFridge }); return true; }
    return actions.addProducts([input], { merge: false });
  };

  const total = activeProducts(data.products).length;

  return (
    <div>
      <PageHeader title="My Fridge" subtitle={`${total} product${total === 1 ? "" : "s"} in your kitchen`} art={<Penguin mood="happy" size={56} className="hidden sm:block" />} />

      <Card className="mb-6 overflow-hidden bg-gradient-to-br from-mint-soft to-ice">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Penguin mood="chef" size={72} className="shrink-0" />
            <div>
              <h2 className="text-lg font-semibold">Scan your fridge</h2>
              <p className="text-sm text-muted">Take one photo and review the list. {integrations?.vision ? "AI suggests what it sees." : "AI recognition is off here, so you type what you see and we do the rest."}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:flex">
            <Button onClick={() => cameraRef.current?.click()} icon={<Camera className="h-4 w-4" />} className="flex-col !h-auto py-3 md:flex-row md:!h-11 md:py-0">Take Photo</Button>
            <Button variant="secondary" onClick={() => uploadRef.current?.click()} icon={<Upload className="h-4 w-4" />} className="flex-col !h-auto py-3 md:flex-row md:!h-11 md:py-0">Upload Photo</Button>
            <Button variant="secondary" onClick={() => { setEditing(null); setFormOpen(true); }} icon={<Plus className="h-4 w-4" />} className="flex-col !h-auto py-3 md:flex-row md:!h-11 md:py-0">Add Manually</Button>
          </div>
          <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label="Take a photo of your fridge" onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload a photo of your fridge" onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {photoError && <div className="mt-4"><ErrorNote>{photoError}</ErrorNote></div>}
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your fridge" aria-label="Search products" className="pl-9" />
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort products" className="sm:w-48">
          <option value="expiry">Expires first</option><option value="name">Name A–Z</option><option value="added">Recently added</option>
        </Select>
      </div>
      <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" role="toolbar" aria-label="Filter products">
        {FILTERS.map((f) => <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}<span className="text-xs opacity-70">{counts[f.id]}</span></Chip>)}
      </div>

      {total === 0 ? (
        <EmptyState art={<Penguin mood="sleep" size={90} />} title="Your fridge is empty" body="Scan a photo of your fridge or add your first product to start tracking expiration dates." action={<Button onClick={() => { setEditing(null); setFormOpen(true); }} icon={<Plus className="h-4 w-4" />}>Add your first product</Button>} />
      ) : items.length === 0 ? (
        <EmptyState art={<Penguin mood="think" size={70} />} title="Nothing matches" body="Try another filter or search word." action={<Button variant="secondary" onClick={() => { setFilter("all"); setQuery(""); }}>Show everything</Button>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => {
            const s = expiryStatus(p);
            return (
              <li key={p.id} className={cn("flex flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-card", s === "expired" ? "border-danger/50" : s === "urgent" ? "border-sun" : "border-line/60")}>
                <div className="flex items-start gap-3">
                  <FoodIcon category={p.category as Category} imageUrl={p.image_url} name={p.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold">{p.name}</h3>
                      <ExpiryBadge p={p} />
                    </div>
                    <p className="text-sm text-muted"><span className="font-bold tabular-nums text-ink">{p.quantity}</span> {p.unit} · {p.storage_location}</p>
                    <p className="text-xs text-muted">{p.category}{p.expiration_date ? ` · expires ${formatDate(p.expiration_date)}` : ""}{p.notes?.includes("estimate") ? " (est.)" : ""}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="soft" icon={<Check className="h-4 w-4" />} onClick={() => setAmountFor({ p, mode: "use" })}>Used</Button>
                  <Button size="sm" variant="ghost" icon={<ChefHat className="h-4 w-4" />} onClick={() => { setIntent({ type: "cook-with", key: productKey(p.name), name: p.name }); nav.push("/cook"); }}>Recipes</Button>
                  <Button size="sm" variant="ghost" icon={<XCircle className="h-4 w-4" />} onClick={() => setAmountFor({ p, mode: "discard" })}>Discard</Button>
                  <span className="flex-1" />
                  <Button size="sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ProductForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} product={editing} onSubmit={submitManual} />
      <ScanFlow open={scanOpen} onClose={() => setScanOpen(false)} image={scanImage} visionAvailable={Boolean(integrations?.vision)} onSave={(rows) => actions.addProducts(rows)} />
      <AmountDialog product={amountFor?.p ?? null} mode={amountFor?.mode ?? "use"} onClose={() => setAmountFor(null)} />
      <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? "product"}?`} danger confirmLabel="Delete"
        message="This removes the product without counting it as used or wasted. To track food waste, choose Discard instead."
        onCancel={() => setDeleting(null)} onConfirm={async () => { if (deleting) await actions.deleteProduct(deleting.id); setDeleting(null); }} />
      <Modal open={Boolean(dup)} onClose={() => setDup(null)} size="sm" title="Already in your fridge"
        footer={<>
          <Button variant="secondary" onClick={() => setDup(null)}>Cancel</Button>
          <Button variant="secondary" onClick={async () => { if (dup) { await actions.updateProduct(dup.existing.id, { quantity: dup.existing.quantity + dup.input.quantity }); } setDup(null); }}>Add to existing</Button>
          <Button onClick={async () => { if (dup) await actions.addProducts([dup.input], { merge: false }); setDup(null); }}>Keep both</Button>
        </>}>
        {dup && <div className="flex items-start gap-3"><Penguin mood="think" size={48} stars={false} /><p className="text-sm text-muted">You already have <b className="text-ink">{dup.existing.quantity} {dup.existing.unit} of {dup.existing.name}</b>{dup.existing.expiration_date ? `, expiring ${formatDate(dup.existing.expiration_date)}` : ""}. Add {dup.input.quantity} {dup.input.unit} to it, or keep them as separate items (for example, with different dates)?</p></div>}
      </Modal>
    </div>
  );
}
