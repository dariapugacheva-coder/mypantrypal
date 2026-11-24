"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, ClipboardPaste, Plus, Trash2, Upload } from "lucide-react";
import type { ShoppingCategory } from "@/types/product";
import { SHOPPING_CATEGORIES } from "@/types/product";
import { useAppData, type PurchaseLine } from "@/lib/data/DataProvider";
import { apiPost } from "@/lib/api/client";
import type { ReceiptResult } from "@/lib/validations/schemas";
import { parseReceiptText } from "@/lib/ocr/parse-text";
import { guessCategory, toShoppingCategory } from "@/lib/etl/normalize";
import { estimateExpiration, defaultStorage } from "@/lib/nutrition/shelf-life";
import { dataUrlToBlob, resizeImage, validateImageFile } from "@/lib/utils/image";
import { uploadUserImage } from "@/lib/supabase/storage";
import { formatMoney, round, toDateKey, uid } from "@/lib/utils";
import { Button, ErrorNote, Field, InfoNote, Input, Modal, Select, Textarea } from "@/components/ui";
import { Penguin } from "@/components/mascot/Penguin";

type Line = PurchaseLine & { key: string; toFridge: boolean };
type Stage = "start" | "reading" | "review" | "fridge";

const NON_FOOD = /paper|soap|detergent|shampoo|towel|bag fee|battery|toothpaste/i;

export function ReceiptFlow({ open, onClose, ocrAvailable }: { open: boolean; onClose: () => void; ocrAvailable: boolean }) {
  const { data, actions, mode } = useAppData();
  const [stage, setStage] = useState<Stage>("start");
  const [image, setImage] = useState<string | null>(null);
  const [store, setStore] = useState("");
  const [date, setDate] = useState(toDateKey());
  const [lines, setLines] = useState<Line[]>([]);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printedTotal, setPrintedTotal] = useState<number | null>(null);
  const cam = useRef<HTMLInputElement>(null);
  const up = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStage("start"); setImage(null); setStore(data.preferences.grocery_preferences.stores[0] ?? ""); setDate(toDateKey()); setLines([]); setPaste(""); setError(null); setPrintedTotal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mk = (l: PurchaseLine): Line => ({ ...l, key: uid(), toFridge: !NON_FOOD.test(l.product_name) });

  const onFile = async (file?: File) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    setError(null);
    const img = await resizeImage(file, 1600, 0.85);
    setImage(img);
    if (!ocrAvailable) return; // keep image as the receipt record; user enters lines below
    setStage("reading");
    const r = await apiPost<ReceiptResult>("/api/receipts", { image: img });
    if (!r.ok) { setError(`${r.error} You can type the items below.`); setStage("start"); return; }
    if (r.data.store_name) setStore(r.data.store_name);
    if (r.data.date) setDate(r.data.date);
    setPrintedTotal(r.data.total);
    setLines(r.data.items.map(mk));
    setStage("review");
  };

  const fromPaste = () => {
    const parsed = parseReceiptText(paste);
    if (!parsed.length) { setError("No lines with prices were found. Use one item per line, like “Milk 3.49”."); return; }
    setError(null);
    setLines(parsed.map(mk));
    setStage("review");
  };

  const set = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const total = round(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0), 2);
  const cur = data.profile.currency;

  const confirm = async () => {
    const valid = lines.filter((l) => l.product_name.trim() && l.quantity > 0 && l.unit_price >= 0);
    if (!valid.length) { setError("Add at least one item with a name, quantity and price."); return; }
    if (!store.trim()) { setError("Enter the store name."); return; }
    setBusy(true);
    let receiptPath: string | null = null;
    if (image && mode === "supabase") {
      // Receipt photos go to the user's private storage folder; only the path is saved.
      try { receiptPath = await uploadUserImage(data.profile.id, await dataUrlToBlob(image), "receipts"); } catch { receiptPath = null; }
    }
    const id = await actions.recordPurchase({ store_name: store, purchase_date: date, lines: valid, receipt_image_url: receiptPath });
    setBusy(false);
    if (id) { setLines(valid); setStage(valid.some((l) => l.toFridge) ? "fridge" : "start"); if (!valid.some((l) => l.toFridge)) onClose(); }
  };

  const addToFridge = async () => {
    setBusy(true);
    const rows = lines.filter((l) => l.toFridge).map((l) => {
      const category = guessCategory(l.product_name);
      const storage = defaultStorage(category);
      return { name: l.product_name, category, quantity: l.quantity, unit: "pcs", storage_location: storage, purchase_date: date, expiration_date: estimateExpiration(l.product_name, category, storage, new Date(date)), estimated_price: round(l.quantity * l.unit_price, 2), notes: "Added from receipt. Expiration date is an estimate." };
    });
    const ok = await actions.addProducts(rows);
    setBusy(false);
    if (ok) onClose();
  };

  const footer = stage === "start" ? (
    <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="secondary" onClick={() => { setLines([mk({ product_name: "", quantity: 1, unit_price: 0, category: "Other" })]); setStage("review"); }} icon={<Plus className="h-4 w-4" />}>Enter items one by one</Button><Button disabled={!paste.trim()} onClick={fromPaste} icon={<ClipboardPaste className="h-4 w-4" />}>Read pasted text</Button></>
  ) : stage === "review" ? (
    <><Button variant="secondary" onClick={() => setLines((l) => [...l, mk({ product_name: "", quantity: 1, unit_price: 0, category: "Other" })])} icon={<Plus className="h-4 w-4" />}>Add line</Button><Button onClick={() => void confirm()} loading={busy} icon={<Check className="h-4 w-4" />}>Confirm purchase · {formatMoney(total, cur)}</Button></>
  ) : stage === "fridge" ? (
    <><Button variant="secondary" onClick={onClose}>Not now</Button><Button onClick={() => void addToFridge()} loading={busy}>Add {lines.filter((l) => l.toFridge).length} to My Fridge</Button></>
  ) : null;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={stage === "fridge" ? "Add to your fridge?" : stage === "review" ? "Review your receipt" : "Add a receipt"} footer={footer}>
      {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}
      {stage === "start" && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="!h-auto flex-col py-4" onClick={() => cam.current?.click()} icon={<Camera className="h-5 w-5" />}>Take photo</Button>
            <Button variant="secondary" className="!h-auto flex-col py-4" onClick={() => up.current?.click()} icon={<Upload className="h-5 w-5" />}>Upload image</Button>
            <input ref={cam} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label="Take a receipt photo" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={up} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload a receipt image" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Receipt" className="max-h-64 w-full rounded-2xl bg-ice object-contain" />
          )}
          {!ocrAvailable && <InfoNote tone="sun">Automatic receipt reading is not connected in this version. Keep the photo for reference, then paste or type the items below. Nothing is saved until you confirm.</InfoNote>}
          <Field label="Paste or type receipt lines" htmlFor="rc-paste" hint="One item per line with its price, like “2 x Eggs 4.20”. Totals and tax lines are skipped.">
            <Textarea id="rc-paste" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"Milk 3.49\n2 x Greek yogurt 11.98\nBananas 1.47\nChicken breast 6.49"} />
          </Field>
        </div>
      )}
      {stage === "reading" && <div className="flex flex-col items-center gap-3 py-10" role="status"><Penguin mood="think" size={90} className="animate-bob" /><p className="font-medium">Reading your receipt…</p></div>}
      {stage === "review" && (
        <div className="flex flex-col gap-4">
          <InfoNote>Check every line. Receipts are often hard to read, so fix anything that looks wrong. Nothing is saved until you confirm.</InfoNote>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Store" htmlFor="rc-store"><Input id="rc-store" value={store} onChange={(e) => setStore(e.target.value)} /></Field>
            <Field label="Date" htmlFor="rc-date"><Input id="rc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <ul className="flex flex-col gap-2">
            {lines.map((l) => (
              <li key={l.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[2fr_.7fr_1fr_1.2fr_auto_auto] sm:items-end">
                <label className="col-span-2 flex flex-col gap-1 text-xs text-muted sm:col-span-1">Item<Input aria-label="Item name" value={l.product_name} onChange={(e) => set(l.key, { product_name: e.target.value, category: toShoppingCategory(guessCategory(e.target.value)) })} /></label>
                <label className="flex flex-col gap-1 text-xs text-muted">Qty<Input aria-label="Quantity" type="number" min="0" step="any" value={l.quantity} onChange={(e) => set(l.key, { quantity: Number(e.target.value) })} /></label>
                <label className="flex flex-col gap-1 text-xs text-muted">Unit price<Input aria-label="Unit price" type="number" min="0" step="0.01" value={l.unit_price} onChange={(e) => set(l.key, { unit_price: Number(e.target.value) })} /></label>
                <label className="flex flex-col gap-1 text-xs text-muted">Category<Select aria-label="Category" value={l.category} onChange={(e) => set(l.key, { category: e.target.value as ShoppingCategory })}>{SHOPPING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></label>
                <label className="flex items-center gap-1.5 text-xs text-muted sm:pb-3"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--mint-strong))]" checked={l.toFridge} onChange={(e) => set(l.key, { toFridge: e.target.checked })} />Fridge</label>
                <Button size="sm" variant="ghost" aria-label={`Remove ${l.product_name || "line"}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="sm:mb-1"><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
          <p className="text-right text-sm">Total <b className="text-lg tabular-nums">{formatMoney(total, cur)}</b>{printedTotal !== null && Math.abs(printedTotal - total) > 0.05 && <span className="block text-xs text-danger-ink">The receipt says {formatMoney(printedTotal, cur)}. Check for a missing or misread line.</span>}</p>
        </div>
      )}
      {stage === "fridge" && (
        <div className="flex items-start gap-4">
          <Penguin mood="cheer" size={80} />
          <div className="text-sm text-muted">
            <p className="mb-2 text-ink">Purchase saved! Do you want to add these items to My Fridge?</p>
            <ul className="list-disc pl-5">{lines.filter((l) => l.toFridge).map((l) => <li key={l.key}>{l.quantity} × {l.product_name}</li>)}</ul>
            <p className="mt-2 text-xs">Expiration dates will be estimated. You can change them in My Fridge.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
