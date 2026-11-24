"use client";
import { useState } from "react";
import { Bell, Copy, Database, Download, LogOut, RefreshCw, Shield, Store, Trash2, Wallet } from "lucide-react";
import { useAppData } from "@/lib/data/DataProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNav } from "@/lib/nav";
import { useToast } from "@/components/ui/toast";
import { Button, Card, CardHeader, ChipPicker, ConfirmDialog, Field, InfoNote, Input, Modal, PageHeader, Select, Textarea, Toggle } from "@/components/ui";

const CURRENCIES = ["USD", "EUR", "GBP", "KRW", "CAD", "KZT", "RUB"];
const STORES = ["Trader Joe's", "Safeway", "Whole Foods", "Costco", "Target", "Local market"];

export function SettingsView() {
  const { data, actions, mode, reload } = useAppData();
  const { signOut, backend } = useAuth();
  const nav = useNav();
  const toast = useToast();
  const p = data.preferences;
  const [weekly, setWeekly] = useState(String(p.budget_settings.weekly));
  const [monthly, setMonthly] = useState(String(p.budget_settings.monthly));
  const [currency, setCurrency] = useState(data.profile.currency);
  const [stores, setStores] = useState(p.grocery_preferences.stores);
  const [habits, setHabits] = useState(p.grocery_preferences.habits);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "sample" | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const saveBudget = async () => {
    const w = Number(weekly), m = Number(monthly);
    if (!(w > 0 && m > 0)) { toast.error("Budgets must be more than 0."); return; }
    await actions.updatePreferences({ budget_settings: { weekly: w, monthly: m }, grocery_preferences: { stores, habits: habits.trim() } }, "Budget and stores saved");
    if (currency !== data.profile.currency) await actions.updateProfile({ currency });
  };

  const setNotif = (k: keyof typeof p.notification_settings, v: boolean) => void actions.updatePreferences({ notification_settings: { ...p.notification_settings, [k]: v } }, "Notification settings saved");

  const copyData = async () => {
    const json = actions.exportData();
    try { await navigator.clipboard.writeText(json); toast.success("Your data was copied as JSON"); } catch { setViewing(json); toast.error("Copying is blocked here. Select the text to copy it."); }
  };

  const doSample = async () => {
    setBusy(true);
    try { await actions.loadSampleData(); await reload(); toast.success("Sample data loaded"); } catch (e) { toast.error((e as Error).message); }
    setBusy(false); setConfirm(null);
  };
  const doDelete = async () => {
    setBusy(true);
    try { await actions.deleteAllData(); nav.replace("/login"); } catch (e) { toast.error(`Could not delete: ${(e as Error).message}`); setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Budget, notifications and your data." />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader icon={<Wallet className="h-5 w-5" />} title="Budget & currency" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Weekly budget" htmlFor="st-w"><Input id="st-w" type="number" min="1" value={weekly} onChange={(e) => setWeekly(e.target.value)} /></Field>
              <Field label="Monthly budget" htmlFor="st-m"><Input id="st-m" type="number" min="1" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></Field>
              <Field label="Currency" htmlFor="st-c"><Select id="st-c" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            </div>
            <div className="mt-6"><CardHeader icon={<Store className="h-5 w-5" />} title="Grocery stores & habits" /></div>
            <ChipPicker idPrefix="st-store" options={STORES} value={stores} onChange={setStores} addLabel="Add a store" />
            <Field label="Shopping habits" htmlFor="st-h" className="mt-4"><Textarea id="st-h" value={habits} onChange={(e) => setHabits(e.target.value)} /></Field>
            <div className="mt-4 flex justify-end"><Button onClick={() => void saveBudget()}>Save</Button></div>
          </Card>
          <Card>
            <CardHeader icon={<Bell className="h-5 w-5" />} title="Notifications" subtitle="Shown in the app's notification center" />
            <div className="divide-y divide-line">
              <Toggle checked={p.notification_settings.expiration} onChange={(v) => setNotif("expiration", v)} label="Expiration alerts" description="When food expires within 2 days" />
              <Toggle checked={p.notification_settings.budget} onChange={(v) => setNotif("budget", v)} label="Budget warnings" description="At 75%, 90% and 100% of your budget" />
              <Toggle checked={p.notification_settings.shopping} onChange={(v) => setNotif("shopping", v)} label="Shopping reminders" description="When your list has items" />
              <Toggle checked={p.notification_settings.vitamins} onChange={(v) => setNotif("vitamins", v)} label="Vitamin reminders" description="For reminders you created" />
              <Toggle checked={p.notification_settings.weekly_report} onChange={(v) => setNotif("weekly_report", v)} label="Weekly report" description="A summary every Sunday" />
            </div>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader icon={<Shield className="h-5 w-5" />} title="Privacy & data" />
            <InfoNote>
              {mode === "supabase" ? "Your data is stored in your MyPantryPal account database and protected so only you can read it." : mode === "demo" ? "You're using the demo account. Its sample data is stored only in this browser." : "Demo mode: your account and data are stored only in this browser. Nothing is sent to a server."}
              {" "}Photos are only analyzed when you choose to scan, and are never shared with stores.
            </InfoNote>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="secondary" icon={<Database className="h-4 w-4" />} onClick={() => setViewing(actions.exportData())}>View my data</Button>
              <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => void copyData()}>Copy my data (JSON)</Button>
              <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setConfirm("sample")}>{mode === "demo" ? "Reset demo data" : "Load sample data"}</Button>
              <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={() => { void signOut().then(() => nav.replace("/login")); }}>Sign out</Button>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => { setTyped(""); setConfirm("delete"); }}>{mode === "demo" ? "Delete demo data" : "Delete my account"}</Button>
            </div>
            <p className="mt-3 text-xs text-muted">Storage: {backend === "supabase" ? "Supabase (cloud)" : "this browser"}.</p>
          </Card>
        </div>
      </div>

      <Modal open={viewing !== null} onClose={() => setViewing(null)} size="lg" title="My data" footer={<Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => void copyData()}>Copy</Button>}>
        <pre className="max-h-[60vh] overflow-auto rounded-xl bg-ice p-3 text-xs">{viewing}</pre>
      </Modal>
      <ConfirmDialog open={confirm === "sample"} title={mode === "demo" ? "Reset demo data?" : "Replace your data with sample data?"} loading={busy}
        message={mode === "demo" ? "Julian's sample fridge, purchases and meals will be restored." : "This replaces your products, lists, purchases and logs with sample data for Julian. Your name and email stay the same. This cannot be undone."}
        confirmLabel={mode === "demo" ? "Reset" : "Replace with sample data"} danger={mode !== "demo"} onCancel={() => setConfirm(null)} onConfirm={() => void doSample()} />
      <Modal open={confirm === "delete"} onClose={() => setConfirm(null)} size="sm" title={mode === "demo" ? "Delete demo data?" : "Delete your account?"}
        footer={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" loading={busy} disabled={typed.trim().toUpperCase() !== "DELETE"} onClick={() => void doDelete()}>Delete forever</Button></>}>
        <div className="flex flex-col gap-4 text-sm text-muted">
          <p>This permanently deletes {mode === "demo" ? "the demo data in this browser" : "your account, fridge, purchases, logs and photos"}. It cannot be undone.</p>
          <Field label="Type DELETE to confirm" htmlFor="del-c"><Input id="del-c" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></Field>
        </div>
      </Modal>
    </div>
  );
}
