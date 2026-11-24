"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useData } from "@/lib/data/DataProvider";
import { useNav } from "@/lib/nav";
import { ALLERGY_OPTIONS } from "@/lib/recipes/engine";
import { Button, ChipPicker, ErrorNote, Field, Input, Select, Textarea } from "@/components/ui";
import { Penguin, type PenguinMood } from "@/components/mascot/Penguin";
import { Brand } from "@/components/layout/Brand";
import { Splash } from "@/components/layout/Guards";
import { cn } from "@/lib/utils";

const DIETS = ["Vegetarian", "Vegan", "Pescatarian", "Halal", "Kosher", "Low sugar"];
const DISLIKES = ["Mushrooms", "Olives", "Cilantro", "Spicy food", "Seafood", "Onions"];
const STORES = ["Trader Joe's", "Safeway", "Whole Foods", "Costco", "Target", "Local market"];
const CURRENCIES = ["USD", "EUR", "GBP", "KRW", "CAD", "KZT", "RUB"];

const STEPS: { title: string; say: string; mood: PenguinMood }[] = [
  { title: "Welcome", say: "Hi! I'm Pip. Let's make your kitchen smarter!", mood: "wave" },
  { title: "About you", say: "First, how should I call you?", mood: "happy" },
  { title: "Food preferences", say: "Tell me what you can't or don't want to eat. Allergies are never recommended.", mood: "think" },
  { title: "Nutrition goals", say: "What would you like to reach each day?", mood: "chef" },
  { title: "Budget", say: "How much do you want to spend on groceries?", mood: "think" },
  { title: "Grocery habits", say: "Where and how do you usually shop?", mood: "happy" },
  { title: "All set", say: "Your smart kitchen is ready!", mood: "cheer" }
];

export function OnboardingView() {
  const { status, user } = useAuth();
  const { data, ready, actions } = useData();
  const nav = useNav();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", age: "", allergies: [] as string[], disliked: [] as string[], diets: [] as string[],
    protein: "100", calories: "", fitness: "", weekly: "60", monthly: "240", currency: "USD", stores: [] as string[], habits: ""
  });

  useEffect(() => { if (status === "signed-out") nav.replace("/login"); }, [status, nav]);
  useEffect(() => {
    if (data) setForm((f) => ({ ...f, full_name: f.full_name || data.profile.full_name || user?.name || "" }));
  }, [data, user?.name]);
  useEffect(() => { if (ready && data?.profile.onboarded) nav.replace("/home"); }, [ready, data?.profile.onboarded, nav]);

  if (status !== "signed-in" || !ready || !data) return <Splash />;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (step === 1 && !form.full_name.trim()) return "Please enter your name.";
    if (step === 1 && form.age && (Number(form.age) < 13 || Number(form.age) > 120)) return "Age must be between 13 and 120, or leave it empty.";
    if (step === 3 && (!Number(form.protein) || Number(form.protein) < 10 || Number(form.protein) > 400)) return "Enter a daily protein goal between 10 and 400 g.";
    if (step === 3 && form.calories && (Number(form.calories) < 800 || Number(form.calories) > 6000)) return "Calories should be between 800 and 6000, or leave it empty.";
    if (step === 4 && (!(Number(form.weekly) > 0) || !(Number(form.monthly) > 0))) return "Enter a weekly and a monthly budget above 0.";
    return null;
  };

  const next = async () => {
    const err = validate();
    setError(err);
    if (err) return;
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    setSaving(true);
    const p = data.preferences;
    const ok = await actions.completeOnboarding(
      { full_name: form.full_name.trim(), age: form.age ? Number(form.age) : null, currency: form.currency },
      {
        allergies: form.allergies, disliked_foods: form.disliked, dietary_preferences: form.diets, fitness_preference: form.fitness.trim(),
        nutrition_goals: { ...p.nutrition_goals, protein: Number(form.protein), calories: form.calories ? Number(form.calories) : p.nutrition_goals.calories },
        budget_settings: { weekly: Number(form.weekly), monthly: Number(form.monthly) },
        grocery_preferences: { stores: form.stores, habits: form.habits.trim() }
      }
    );
    setSaving(false);
    if (ok) nav.replace("/home");
  };

  const s = STEPS[step];
  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col gutter py-6">
        <div className="flex items-center justify-between"><Brand /><span className="text-sm text-muted">Step {step + 1} of {STEPS.length}</span></div>
        <div className="mt-4 flex gap-1.5" aria-hidden>{STEPS.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition", i <= step ? "bg-mint-strong" : "bg-line")} />)}</div>

        <div className="mt-8 flex items-end gap-4">
          <Penguin mood={s.mood} size={step === 0 || step === 6 ? 110 : 76} className="animate-bob" />
          <div className="relative mb-3 rounded-2xl rounded-bl-sm bg-surface px-4 py-3 text-sm font-medium text-ink shadow-card">{s.say}</div>
        </div>

        <div className="mt-6 flex-1 rounded-3xl bg-surface p-6 shadow-card">
          <h1 className="mb-5 text-2xl font-semibold tracking-tight">{s.title}</h1>
          {error && <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>}

          {step === 0 && (
            <div className="flex flex-col gap-3 text-sm text-muted">
              <p>MyPantryPal helps you know what food you have, use it before it expires, cook with what you already own and keep your grocery budget on track.</p>
              <ul className="grid gap-2 sm:grid-cols-3">
                {["Scan your fridge with a photo", "Get recipes from your ingredients", "Track money, protein and waste"].map((t) => <li key={t} className="flex items-start gap-2 rounded-xl bg-mint-soft p-3 text-mint-ink"><Check className="mt-0.5 h-4 w-4 shrink-0" />{t}</li>)}
              </ul>
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="ob-name" className="sm:col-span-2"><Input id="ob-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" /></Field>
              <Field label="Email" htmlFor="ob-email" hint="Your password was set when you created the account."><Input id="ob-email" value={data.profile.email} disabled /></Field>
              <Field label="Age (optional)" htmlFor="ob-age"><Input id="ob-age" type="number" inputMode="numeric" value={form.age} onChange={(e) => set("age", e.target.value)} /></Field>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <Field label="Allergies"><ChipPicker idPrefix="ob-allergy" options={ALLERGY_OPTIONS} value={form.allergies} onChange={(v) => set("allergies", v)} addLabel="Add another allergy" /></Field>
              <Field label="Foods you dislike"><ChipPicker idPrefix="ob-dislike" options={DISLIKES} value={form.disliked} onChange={(v) => set("disliked", v)} addLabel="Add a food" /></Field>
              <Field label="Dietary preferences"><ChipPicker idPrefix="ob-diet" options={DIETS} value={form.diets} onChange={(v) => set("diets", v)} addLabel="Add a preference" /></Field>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Daily protein goal (g)" htmlFor="ob-protein" hint="A common starting point is 1.2–1.6 g per kg of body weight."><Input id="ob-protein" type="number" inputMode="numeric" value={form.protein} onChange={(e) => set("protein", e.target.value)} /></Field>
              <Field label="Daily calories (optional)" htmlFor="ob-cal"><Input id="ob-cal" type="number" inputMode="numeric" value={form.calories} onChange={(e) => set("calories", e.target.value)} placeholder="2200" /></Field>
              <Field label="Fitness or nutrition preferences" htmlFor="ob-fit" className="sm:col-span-2"><Textarea id="ob-fit" value={form.fitness} onChange={(e) => set("fitness", e.target.value)} placeholder="For example: gym 3 times a week, want more protein" /></Field>
            </div>
          )}
          {step === 4 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Weekly budget" htmlFor="ob-week"><Input id="ob-week" type="number" inputMode="decimal" value={form.weekly} onChange={(e) => set("weekly", e.target.value)} /></Field>
              <Field label="Monthly budget" htmlFor="ob-month"><Input id="ob-month" type="number" inputMode="decimal" value={form.monthly} onChange={(e) => set("monthly", e.target.value)} /></Field>
              <Field label="Currency" htmlFor="ob-cur"><Select id="ob-cur" value={form.currency} onChange={(e) => set("currency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            </div>
          )}
          {step === 5 && (
            <div className="flex flex-col gap-6">
              <Field label="Favorite grocery stores"><ChipPicker idPrefix="ob-store" options={STORES} value={form.stores} onChange={(v) => set("stores", v)} addLabel="Add a store" /></Field>
              <Field label="Shopping habits" htmlFor="ob-habits"><Textarea id="ob-habits" value={form.habits} onChange={(e) => set("habits", e.target.value)} placeholder="For example: one big shop on Sunday, I prefer store brands" /></Field>
            </div>
          )}
          {step === 6 && (
            <div className="flex flex-col gap-3 text-sm text-muted">
              <p>Here is what I'll use to personalize MyPantryPal. You can change any of it later in your profile.</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Name", form.full_name], ["Allergies", form.allergies.join(", ") || "None"], ["Protein goal", `${form.protein} g per day`],
                  ["Budget", `${form.weekly} ${form.currency} weekly, ${form.monthly} monthly`], ["Diet", form.diets.join(", ") || "No restrictions"], ["Stores", form.stores.join(", ") || "Not set"]
                ].map(([k, v]) => <div key={k} className="rounded-xl bg-ice p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>)}
              </dl>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => { setError(null); setStep(Math.max(0, step - 1)); }} disabled={step === 0} icon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          <Button size="lg" onClick={() => void next()} loading={saving} icon={step === STEPS.length - 1 ? <Check className="h-4 w-4" /> : undefined}>
            {step === 0 ? "Let's start" : step === STEPS.length - 1 ? "Go to my kitchen" : "Continue"}
            {step > 0 && step < STEPS.length - 1 && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
