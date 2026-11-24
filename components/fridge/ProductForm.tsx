"use client";
import { useEffect, useState } from "react";
import { ImagePlus, Wand2 } from "lucide-react";
import type { Product } from "@/types/database";
import { CATEGORIES, STORAGE_LOCATIONS, UNITS, type Category, type StorageLocation } from "@/types/product";
import type { ProductInput } from "@/lib/data/DataProvider";
import { ProductFormSchema } from "@/lib/validations/schemas";
import { defaultStorage, estimateExpiration } from "@/lib/nutrition/shelf-life";
import { guessCategory } from "@/lib/etl/normalize";
import { resizeImage, validateImageFile } from "@/lib/utils/image";
import { formatDate, toDateKey } from "@/lib/utils";
import { Button, ErrorNote, Field, Input, Modal, Select, Textarea } from "@/components/ui";

interface FormState { name: string; category: Category; quantity: string; unit: string; purchase_date: string; expiration_date: string; storage_location: StorageLocation; notes: string; price: string; image_url: string | null }

const blank = (): FormState => ({ name: "", category: "Other", quantity: "1", unit: "pcs", purchase_date: toDateKey(), expiration_date: "", storage_location: "Refrigerator", notes: "", price: "", image_url: null });

export function ProductForm({ open, onClose, product, onSubmit }: { open: boolean; onClose: () => void; product?: Product | null; onSubmit: (input: ProductInput) => Promise<boolean> }) {
  const [f, setF] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setCategoryTouched(Boolean(product));
    setF(product ? {
      name: product.name, category: product.category, quantity: String(product.quantity), unit: product.unit, purchase_date: product.purchase_date ?? "",
      expiration_date: product.expiration_date ?? "", storage_location: product.storage_location, notes: product.notes ?? "", price: product.estimated_price?.toString() ?? "", image_url: product.image_url
    } : blank());
  }, [open, product]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const onName = (name: string) => {
    setF((s) => {
      const category = categoryTouched ? s.category : guessCategory(name);
      return { ...s, name, category, storage_location: categoryTouched ? s.storage_location : defaultStorage(category) };
    });
  };

  const estimate = () => set("expiration_date", estimateExpiration(f.name || "item", f.category, f.storage_location, f.purchase_date ? new Date(f.purchase_date) : new Date()));

  const onPhoto = async (file?: File) => {
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setErrors((e) => ({ ...e, image: err })); return; }
    setErrors((e) => ({ ...e, image: "" }));
    set("image_url", await resizeImage(file, 240, 0.8));
  };

  const submit = async () => {
    const parsed = ProductFormSchema.safeParse({
      name: f.name, category: f.category, quantity: f.quantity, unit: f.unit, purchase_date: f.purchase_date || null, expiration_date: f.expiration_date || null,
      storage_location: f.storage_location, notes: f.notes.trim() || null, estimated_price: f.price ? Number(f.price) : null
    });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) e[String(issue.path[0])] = issue.message;
      setErrors(e);
      return;
    }
    if (parsed.data.expiration_date && parsed.data.purchase_date && parsed.data.expiration_date < parsed.data.purchase_date) {
      setErrors({ expiration_date: "The expiration date is before the purchase date." });
      return;
    }
    setSaving(true);
    const ok = await onSubmit({ ...parsed.data, image_url: f.image_url });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? `Edit ${product.name}` : "Add a product"} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} loading={saving}>{product ? "Save changes" : "Add Product"}</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        <Field label="Product name" htmlFor="pf-name" error={errors.name} className="sm:col-span-2"><Input id="pf-name" value={f.name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Greek yogurt" /></Field>
        <Field label="Category" htmlFor="pf-cat"><Select id="pf-cat" value={f.category} onChange={(e) => { setCategoryTouched(true); set("category", e.target.value as Category); }}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Storage location" htmlFor="pf-store"><Select id="pf-store" value={f.storage_location} onChange={(e) => set("storage_location", e.target.value as StorageLocation)}>{STORAGE_LOCATIONS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Quantity" htmlFor="pf-qty" error={errors.quantity}><Input id="pf-qty" type="number" inputMode="decimal" min="0" step="any" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>
        <Field label="Unit" htmlFor="pf-unit"><Select id="pf-unit" value={f.unit} onChange={(e) => set("unit", e.target.value)}>{Array.from(new Set([...UNITS, f.unit])).map((u) => <option key={u}>{u}</option>)}</Select></Field>
        <Field label="Purchase date" htmlFor="pf-pd"><Input id="pf-pd" type="date" value={f.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} /></Field>
        <Field label="Expiration date" htmlFor="pf-ed" error={errors.expiration_date} hint="Use the date on the package when you have it.">
          <div className="flex gap-2">
            <Input id="pf-ed" type="date" value={f.expiration_date} onChange={(e) => set("expiration_date", e.target.value)} />
            <Button variant="secondary" onClick={estimate} title="Estimate from food type and storage" icon={<Wand2 className="h-4 w-4" />}><span className="sr-only sm:not-sr-only">Estimate</span></Button>
          </div>
        </Field>
        <Field label="Price paid (optional)" htmlFor="pf-price" hint="Used to estimate money saved or wasted."><Input id="pf-price" type="number" inputMode="decimal" min="0" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Photo (optional)" htmlFor="pf-photo" error={errors.image}>
          <label htmlFor="pf-photo" className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line px-3 text-sm text-muted hover:border-mint-strong">
            {f.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : <ImagePlus className="h-5 w-5" />}
            {f.image_url ? "Change photo" : "Choose a photo"}
            <input id="pf-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </label>
        </Field>
        <Field label="Notes" htmlFor="pf-notes" className="sm:col-span-2"><Textarea id="pf-notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Opened on Monday, top shelf…" /></Field>
        {errors.form && <div className="sm:col-span-2"><ErrorNote>{errors.form}</ErrorNote></div>}
        {f.expiration_date && <p className="text-xs text-muted sm:col-span-2">Expires {formatDate(f.expiration_date, { weekday: "short", month: "short", day: "numeric" })}.</p>}
      </form>
    </Modal>
  );
}
