"use client";
import { useEffect, useState } from "react";
import { Bell, Heart, Pencil, Pill, Plus, Settings, Target, Trash2, User } from "lucide-react";
import type { Reminder } from "@/types/database";
import { useAppData } from "@/lib/data/DataProvider";
import { ALLERGY_OPTIONS } from "@/lib/recipes/engine";
import { Link } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, ChipPicker, ConfirmDialog, ErrorNote, Field, InfoNote, Input, Modal, PageHeader, Textarea, Toggle } from "@/components/ui";
import { Avatar } from "@/components/layout/AppShell";

const DIETS = ["Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher", "Low sugar"];
const CUISINES = ["Asian", "Mexican", "Italian", "American", "Mediterranean", "Indian", "Korean"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PersonalCard() {
  const { data, actions } = useAppData();
  const [name, setName] = useState(data.profile.full_name);
  const [age, setAge] = useState(data.profile.age?.toString() ?? "");
  const [err, setErr] = useState<string | null>(null);
  const dirty = name !== data.profile.full_name || age !== (data.profile.age?.toString() ?? "");
  const save = async () => {
    if (!name.trim()) { setErr("Enter your name."); return; }
    if (age && (Number(age) < 13 || Number(age) > 120)) { setErr("Age must be between 13 and 120."); return; }
    setErr(null);
    await actions.updateProfile({ full_name: name.trim(), age: age ? Number(age) : null });
  };
  return (
    <Card>
      <CardHeader icon={<User className="h-5 w-5" />} title="Personal information" />
      <div className="mb-5 flex items-center gap-4"><Avatar name={data.profile.full_name || "You"} size={64} /><div><p className="text-lg font-semibold">{data.profile.full_name || "Your name"}</p><p className="text-sm text-muted">{data.profile.email}</p>{data.profile.is_demo && <Badge tone="warning" className="mt-1">Demo account · sample data</Badge>}</div></div>
      {err && <div className="mb-4"><ErrorNote>{err}</ErrorNote></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="pr-name"><Input id="pr-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Age (optional)" htmlFor="pr-age"><Input id="pr-age" type="number" value={age} onChange={(e) => setAge(e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex justify-end"><Button disabled={!dirty} onClick={() => void save()}>Save</Button></div>
    </Card>
  );
}

function GoalsCard() {
  const { data, actions } = useAppData();
  const g = data.preferences.nutrition_goals;
  const [f, setF] = useState({ calories: String(g.calories), protein: String(g.protein), carbohydrates: String(g.carbohydrates), fat: String(g.fat), water_ml: String(g.water_ml) });
  const [fit, setFit] = useState(data.preferences.fitness_preference);
  const [err, setErr] = useState<string | null>(null);
  const limits: Record<keyof typeof f, [number, number, string]> = { calories: [800, 6000, "Calories (kcal)"], protein: [10, 400, "Protein (g)"], carbohydrates: [20, 900, "Carbs (g)"], fat: [10, 300, "Fat (g)"], water_ml: [500, 6000, "Water (ml)"] };
  const save = async () => {
    for (const [k, [min, max, label]] of Object.entries(limits)) {
      const v = Number(f[k as keyof typeof f]);
      if (!(v >= min && v <= max)) { setErr(`${label} should be between ${min} and ${max}.`); return; }
    }
    setErr(null);
    await actions.updatePreferences({ nutrition_goals: { calories: +f.calories, protein: +f.protein, carbohydrates: +f.carbohydrates, fat: +f.fat, water_ml: +f.water_ml }, fitness_preference: fit.trim() }, "Goals saved");
  };
  return (
    <Card>
      <CardHeader icon={<Target className="h-5 w-5" />} title="Nutrition goals" subtitle="Daily targets used for your rings and recipe suggestions" />
      {err && <div className="mb-4"><ErrorNote>{err}</ErrorNote></div>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {(Object.keys(limits) as (keyof typeof f)[]).map((k) => <Field key={k} label={limits[k][2]} htmlFor={`g-${k}`}><Input id={`g-${k}`} type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}
      </div>
      <Field label="Fitness preferences" htmlFor="g-fit" className="mt-4"><Textarea id="g-fit" value={fit} onChange={(e) => setFit(e.target.value)} placeholder="e.g. gym 3 times a week" /></Field>
      <div className="mt-4 flex justify-end"><Button onClick={() => void save()}>Save goals</Button></div>
    </Card>
  );
}

function FoodPrefsCard() {
  const { data, actions } = useAppData();
  const p = data.preferences;
  const [allergies, setAllergies] = useState(p.allergies);
  const [disliked, setDisliked] = useState(p.disliked_foods);
  const [diets, setDiets] = useState(p.dietary_preferences);
  const [cuisines, setCuisines] = useState(p.preferred_cuisines);
  const [avoid, setAvoid] = useState(p.foods_to_avoid);
  return (
    <Card>
      <CardHeader icon={<Heart className="h-5 w-5" />} title="Food preferences" />
      <InfoNote tone="sun">Allergies are strict: recipes with these ingredients are never suggested. Always check labels yourself, too.</InfoNote>
      <div className="mt-5 flex flex-col gap-6">
        <Field label="Allergies"><ChipPicker idPrefix="pf-al" options={ALLERGY_OPTIONS} value={allergies} onChange={setAllergies} addLabel="Add an allergy" /></Field>
        <Field label="Dietary preferences"><ChipPicker idPrefix="pf-di" options={DIETS} value={diets} onChange={setDiets} addLabel="Add a preference" /></Field>
        <Field label="Favorite cuisines"><ChipPicker idPrefix="pf-cu" options={CUISINES} value={cuisines} onChange={setCuisines} addLabel="Add a cuisine" /></Field>
        <Field label="Foods you dislike"><ChipPicker idPrefix="pf-dl" options={[]} value={disliked} onChange={setDisliked} addLabel="Add a food" /></Field>
        <Field label="Foods to avoid"><ChipPicker idPrefix="pf-av" options={[]} value={avoid} onChange={setAvoid} addLabel="Add a food" /></Field>
      </div>
      <div className="mt-4 flex justify-end"><Button onClick={() => void actions.updatePreferences({ allergies, disliked_foods: disliked, dietary_preferences: diets, preferred_cuisines: cuisines, foods_to_avoid: avoid }, "Food preferences saved")}>Save preferences</Button></div>
    </Card>
  );
}

function ReminderForm({ open, onClose, reminder }: { open: boolean; onClose: () => void; reminder: Reminder | null }) {
  const { actions } = useAppData();
  const [f, setF] = useState({ title: "", time: "09:00", days: [0, 1, 2, 3, 4, 5, 6], notes: "", enabled: true });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setErr(null); setF(reminder ? { title: reminder.title, time: reminder.reminder_time, days: reminder.repeat_days, notes: reminder.notes ?? "", enabled: reminder.enabled } : { title: "", time: "09:00", days: [0, 1, 2, 3, 4, 5, 6], notes: "", enabled: true }); } }, [open, reminder]);
  const save = async () => {
    if (!f.title.trim()) { setErr("Enter what to take, e.g. Vitamin D."); return; }
    if (!f.days.length) { setErr("Choose at least one day."); return; }
    const ok = await actions.saveReminder({ id: reminder?.id, title: f.title.trim(), reminder_time: f.time, repeat_days: [...f.days].sort(), notes: f.notes.trim() || null, enabled: f.enabled });
    if (ok) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" title={reminder ? "Edit reminder" : "New vitamin reminder"} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void save()}>Save</Button></>}>
      <div className="flex flex-col gap-4">
        {err && <ErrorNote>{err}</ErrorNote>}
        <Field label="Vitamin or supplement" htmlFor="rm-t"><Input id="rm-t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Vitamin D" /></Field>
        <Field label="Time" htmlFor="rm-time"><Input id="rm-time" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value || "09:00" })} /></Field>
        <div><p className="mb-1.5 text-sm font-medium">Repeat on</p><div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => <button key={d} type="button" aria-pressed={f.days.includes(i)} onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i] })} className={cn("h-9 w-11 rounded-lg border text-xs font-medium", f.days.includes(i) ? "border-mint-strong bg-mint-soft text-mint-ink" : "border-line text-muted")}>{d}</button>)}</div></div>
        <Field label="Notes (optional)" htmlFor="rm-n"><Input id="rm-n" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Take with breakfast" /></Field>
        <Toggle checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} label="Reminder on" />
        <p className="text-xs text-muted">MyPantryPal only reminds you about what you add. It does not recommend vitamins or doses. Ask a doctor or pharmacist for advice.</p>
      </div>
    </Modal>
  );
}

function RemindersCard() {
  const { data, actions } = useAppData();
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Reminder | null>(null);
  return (
    <Card>
      <CardHeader icon={<Pill className="h-5 w-5" />} title="Vitamin reminders" subtitle="Reminders for supplements you already take" action={<Button size="sm" variant="soft" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setOpen(true); }}>Add</Button>} />
      {data.reminders.length === 0 ? <p className="text-sm text-muted">No reminders yet.</p> : (
        <ul className="divide-y divide-line">
          {data.reminders.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1"><p className={cn("text-sm font-medium", !r.enabled && "text-muted")}>{r.title}</p><p className="text-xs text-muted">{r.reminder_time} · {r.repeat_days.length === 7 ? "Every day" : r.repeat_days.map((d) => DAYS[d]).join(", ")}{r.notes ? ` · ${r.notes}` : ""}</p></div>
              <Toggle checked={r.enabled} onChange={(v) => void actions.saveReminder({ ...r, enabled: v })} label={`${r.title} reminder on`} hideLabel />
              <Button size="sm" variant="ghost" aria-label={`Edit ${r.title}`} onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" aria-label={`Delete ${r.title}`} onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      <ReminderForm open={open} onClose={() => setOpen(false)} reminder={editing} />
      <ConfirmDialog open={Boolean(del)} danger title={`Delete ${del?.title ?? "reminder"}?`} message="You will stop getting this reminder." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={async () => { if (del) await actions.deleteReminder(del.id); setDel(null); }} />
    </Card>
  );
}

export function ProfileView() {
  return (
    <div>
      <PageHeader title="Me" subtitle="Your profile, goals and preferences." action={<><Link href="/notifications" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium hover:border-mint-strong"><Bell className="h-4 w-4" />Notifications</Link><Link href="/settings" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium hover:border-mint-strong"><Settings className="h-4 w-4" />Settings</Link></>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6"><PersonalCard /><GoalsCard /></div>
        <div className="flex min-w-0 flex-col gap-6"><FoodPrefsCard /><RemindersCard /></div>
      </div>
    </div>
  );
}
