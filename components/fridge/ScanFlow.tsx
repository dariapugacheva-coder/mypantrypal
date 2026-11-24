"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, HelpCircle, Plus, Sparkles, Trash2 } from "lucide-react";
import type { DetectedProduct } from "@/types/product";
import { CATEGORIES, STORAGE_LOCATIONS, UNITS, type Category, type StorageLocation } from "@/types/product";
import type { ProductInput } from "@/lib/data/DataProvider";
import { apiPost } from "@/lib/api/client";
import type { VisionResult } from "@/lib/validations/schemas";
import { estimateExpiration, defaultStorage } from "@/lib/nutrition/shelf-life";
import { guessCategory, normalizeUnit } from "@/lib/etl/normalize";
import { SAMPLE_PRICES } from "@/lib/demo/coupons";
import { productKey } from "@/lib/etl/normalize";
import { uid, titleCase } from "@/lib/utils";
import { Badge, Button, ErrorNote, InfoNote, Input, Modal, Select, Textarea } from "@/components/ui";
import { Penguin } from "@/components/mascot/Penguin";

type Stage = "preview" | "processing" | "manual" | "review";

function toDetected(name: string, partial: Partial<DetectedProduct> = {}): DetectedProduct {
  const category = (partial.category ?? guessCategory(name)) as Category;
  const storage = (partial.storage_location ?? defaultStorage(category)) as StorageLocation;
  return {
    key: uid(), name: titleCase(name), category, quantity: partial.quantity ?? 1, unit: normalizeUnit(partial.unit ?? "pcs"), storage_location: storage,
    expiration_date: estimateExpiration(name, category, storage), confidence: partial.confidence ?? 1, alternatives: partial.alternatives,
    estimated_price: SAMPLE_PRICES[productKey(name)] ?? null
  };
}

/** Parses "2 milk, eggs x12, spinach" into rows for the manual fallback. */
function parseQuickList(text: string): DetectedProduct[] {
  return text.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean).map((t) => {
    const m = t.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.*)$/i) ?? t.match(/^(.*?)\s*x\s*(\d+(?:\.\d+)?)$/i);
    if (m && /^\d/.test(m[1])) return toDetected(m[2], { quantity: Number(m[1]) });
    if (m) return toDetected(m[1], { quantity: Number(m[2]) });
    return toDetected(t);
  });
}

export function ScanFlow({ open, onClose, image, visionAvailable, onSave }: { open: boolean; onClose: () => void; image: string | null; visionAvailable: boolean; onSave: (items: ProductInput[]) => Promise<boolean> }) {
  const [stage, setStage] = useState<Stage>("preview");
  const [rows, setRows] = useState<DetectedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quick, setQuick] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStage("preview"); setRows([]); setError(null); setQuick("");
  }, [open, image]);

  const process = async () => {
    if (!image) return;
    if (!visionAvailable) { setStage("manual"); return; }
    setStage("processing");
    setError(null);
    const r = await apiPost<VisionResult>("/api/ai/fridge", { image });
    if (!r.ok) {
      setError(r.error);
      setStage("manual");
      return;
    }
    if (!r.data.products.length) {
      setError("No food was recognized in this photo. Try a brighter photo, or add items below.");
      setStage("manual");
      return;
    }
    setRows(r.data.products.map((p) => toDetected(p.name, { ...p, alternatives: p.confidence < 0.6 ? p.alternatives : undefined })));
    setStage("review");
  };

  const update = (key: string, patch: Partial<DetectedProduct>) => setRows((rs) => rs.map((r) => {
    if (r.key !== key) return r;
    const next = { ...r, ...patch };
    if (patch.name || patch.category || patch.storage_location) next.expiration_date = estimateExpiration(next.name, next.category, next.storage_location);
    return next;
  }));

  const unresolved = rows.filter((r) => r.alternatives?.length && r.confidence < 0.6).length;

  const save = async () => {
    const valid = rows.filter((r) => r.name.trim() && r.quantity > 0);
    if (!valid.length) { setError("Add at least one product before saving."); return; }
    setSaving(true);
    const ok = await onSave(valid.map((r) => ({
      name: r.name.trim(), category: r.category, quantity: r.quantity, unit: r.unit, storage_location: r.storage_location,
      expiration_date: r.expiration_date, estimated_price: r.estimated_price ? Math.round(r.estimated_price * r.quantity * 100) / 100 : null,
      notes: "Added from fridge scan. Expiration date is an estimate."
    })));
    setSaving(false);
    if (ok) onClose();
  };

  const footer = stage === "preview" ? (
    <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void process()} icon={<Sparkles className="h-4 w-4" />}>{visionAvailable ? "Identify my groceries" : "Continue"}</Button></>
  ) : stage === "manual" ? (
    <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!quick.trim()} onClick={() => { setRows(parseQuickList(quick)); setStage("review"); setError(null); }}>Review items</Button></>
  ) : stage === "review" ? (
    <><Button variant="secondary" onClick={() => setRows((r) => [...r, toDetected("New item")])} icon={<Plus className="h-4 w-4" />}>Add row</Button><Button onClick={() => void save()} loading={saving} icon={<Check className="h-4 w-4" />}>Save {rows.length} product{rows.length === 1 ? "" : "s"}</Button></>
  ) : null;

  return (
    <Modal open={open} onClose={onClose} title={stage === "review" ? "Check what we found" : "Scan your fridge"} size={stage === "review" ? "full" : "lg"} footer={footer}>
      {stage === "preview" && image && (
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Your fridge photo" className="max-h-[50vh] w-full rounded-2xl object-contain bg-ice" />
          {!visionAvailable && <InfoNote tone="sun" icon={<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}>AI recognition is not connected in this version. Next, you can type what you see in the photo, and MyPantryPal will organize it and estimate expiration dates.</InfoNote>}
        </div>
      )}
      {stage === "processing" && (
        <div className="flex flex-col items-center gap-4 py-10 text-center" role="status">
          <Penguin mood="think" size={90} className="animate-bob" />
          <p className="font-medium">Looking at your groceries…</p>
          <p className="text-sm text-muted">This usually takes 5 to 15 seconds.</p>
        </div>
      )}
      {stage === "manual" && (
        <div className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Your fridge photo" className="max-h-56 w-full rounded-2xl object-contain bg-ice" />
          )}
          <label htmlFor="scan-quick" className="text-sm font-medium">List what you see, separated by commas or new lines</label>
          <Textarea id="scan-quick" value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="2 milk, 12 eggs, spinach, greek yogurt, chicken breast" rows={4} />
          <p className="text-xs text-muted">Tip: start with a number for the quantity, like “6 eggs”.</p>
        </div>
      )}
      {stage === "review" && (
        <div className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <InfoNote icon={<HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />}>Expiration dates are <b>estimates</b> based on the food type and where it's stored. A photo can't show the real date, so change any date to the one on the package.</InfoNote>
          {unresolved > 0 && <InfoNote tone="sun">I'm not sure about {unresolved} item{unresolved === 1 ? "" : "s"}. Please choose below.</InfoNote>}
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <li key={r.key} className="rounded-2xl border border-line p-3">
                {r.alternatives?.length && r.confidence < 0.6 ? (
                  <div className="mb-3 rounded-xl bg-sun-soft p-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-sun-ink"><Penguin size={26} stars={false} mood="think" />Is this {[r.name, ...r.alternatives.filter((a) => a.toLowerCase() !== r.name.toLowerCase())].slice(0, 3).map((x) => x.toLowerCase()).join(" or ")}?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[r.name, ...r.alternatives.filter((a) => a.toLowerCase() !== r.name.toLowerCase())].slice(0, 3).map((opt) => (
                        <Button key={opt} size="sm" variant="secondary" onClick={() => update(r.key, { name: titleCase(opt), category: guessCategory(opt), confidence: 1, alternatives: undefined })}>{titleCase(opt)}</Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1.3fr_.7fr_.9fr_1.2fr_1.3fr_auto] sm:items-end">
                  <label className="col-span-2 flex flex-col gap-1 text-xs text-muted sm:col-span-1">Name<Input aria-label="Product name" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} /></label>
                  <label className="flex flex-col gap-1 text-xs text-muted">Category<Select aria-label="Category" value={r.category} onChange={(e) => update(r.key, { category: e.target.value as Category })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></label>
                  <label className="flex flex-col gap-1 text-xs text-muted">Qty<Input aria-label="Quantity" type="number" min="0" step="any" value={r.quantity} onChange={(e) => update(r.key, { quantity: Number(e.target.value) })} /></label>
                  <label className="flex flex-col gap-1 text-xs text-muted">Unit<Select aria-label="Unit" value={r.unit} onChange={(e) => update(r.key, { unit: e.target.value })}>{Array.from(new Set([...UNITS, r.unit])).map((u) => <option key={u}>{u}</option>)}</Select></label>
                  <label className="flex flex-col gap-1 text-xs text-muted">Storage<Select aria-label="Storage" value={r.storage_location} onChange={(e) => update(r.key, { storage_location: e.target.value as StorageLocation })}>{STORAGE_LOCATIONS.map((s) => <option key={s}>{s}</option>)}</Select></label>
                  <label className="flex flex-col gap-1 text-xs text-muted">Expires (est.)<Input aria-label="Expiration date" type="date" value={r.expiration_date ?? ""} onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, expiration_date: e.target.value || null } : x)))} /></label>
                  <div className="flex items-center justify-end gap-2 sm:pb-1">
                    {visionAvailable && r.confidence < 1 && <Badge tone={r.confidence >= 0.8 ? "mint" : r.confidence >= 0.6 ? "warning" : "danger"}>{Math.round(r.confidence * 100)}%</Badge>}
                    <Button size="sm" variant="ghost" aria-label={`Remove ${r.name}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
