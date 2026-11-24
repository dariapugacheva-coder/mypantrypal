"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Link, useNav } from "@/lib/nav";
import { Button, ErrorNote, Field, InfoNote, Input } from "@/components/ui";
import { Penguin } from "@/components/mascot/Penguin";
import { Brand, Credits } from "@/components/layout/Brand";
import { GuestOnly } from "@/components/layout/Guards";

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-full md:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-mint-soft md:flex md:flex-col md:justify-between md:p-12">
        <Brand />
        <div className="max-w-md">
          <Penguin mood="wave" size={150} className="mb-8 animate-bob" />
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-ink">Know your fridge.<br />Save your money.<br /><span className="text-mint-ink">Eat better.</span></h2>
          <p className="mt-4 text-base text-muted">MyPantryPal tracks what you have, warns you before food expires, suggests recipes from your own ingredients and keeps your grocery budget on track.</p>
          <ul className="mt-6 grid grid-cols-3 gap-3 text-sm">
            {[["Scan", "your fridge"], ["Cook", "what you have"], ["Track", "money & protein"]].map(([a, b]) => (
              <li key={a} className="rounded-2xl bg-surface/80 p-3"><span className="block font-semibold text-ink">{a}</span><span className="text-muted">{b}</span></li>
            ))}
          </ul>
        </div>
        <Credits />
      </section>
      <section className="flex flex-col justify-center gutter py-10 md:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 md:hidden"><Brand /></div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
          <Credits className="mt-10 text-center md:hidden" />
        </div>
      </section>
    </div>
  );
}

function DemoButton() {
  const { startDemo } = useAuth();
  const nav = useNav();
  return (
    <div className="mt-6 rounded-2xl border border-line bg-ice/60 p-4">
      <div className="flex items-start gap-3">
        <Penguin mood="cheer" size={44} stars={false} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Try the demo</p>
          <p className="text-xs text-muted">Explore MyPantryPal as Julian, a student with a stocked fridge and a weekly budget. Demo data is sample data and stays in this browser.</p>
        </div>
      </div>
      <Button variant="secondary" className="mt-3 w-full" icon={<Sparkles className="h-4 w-4" />} onClick={() => { startDemo(); nav.replace("/home"); }}>Explore the demo as Julian</Button>
    </div>
  );
}

function LocalModeNote() {
  const { backend } = useAuth();
  if (backend === "supabase") return null;
  return <InfoNote tone="sun"><b>Demo mode.</b> Supabase is not connected yet, so accounts and data are saved only in this browser.</InfoNote>;
}

export function LoginView() {
  const { signIn } = useAuth();
  const nav = useNav();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await signIn(email, password);
    setLoading(false);
    if (!r.ok) setError(r.error);
    else nav.replace("/home");
  };
  return (
    <GuestOnly>
      <AuthLayout title="Welcome back" subtitle="Sign in to see what's in your fridge today." footer={<>New to MyPantryPal? <Link href="/signup" className="font-medium text-mint-ink hover:underline">Create an account</Link></>}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <LocalModeNote />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Email" htmlFor="login-email"><Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" /></Field>
          <Field label="Password" htmlFor="login-password"><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <div className="flex justify-end"><Link href="/reset-password" className="text-sm text-mint-ink hover:underline">Forgot password?</Link></div>
          <Button type="submit" size="lg" loading={loading} icon={<ArrowRight className="h-4 w-4" />}>Sign in</Button>
        </form>
        <DemoButton />
      </AuthLayout>
    </GuestOnly>
  );
}

export function SignupView() {
  const { signUp } = useAuth();
  const nav = useNav();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await signUp(name, email, password);
    setLoading(false);
    if (!r.ok) setError(r.error);
    else nav.replace("/onboarding");
  };
  return (
    <GuestOnly>
      <AuthLayout title="Let's make your kitchen smarter!" subtitle="Create your account. Setup takes about two minutes." footer={<>Already have an account? <Link href="/login" className="font-medium text-mint-ink hover:underline">Sign in</Link></>}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <LocalModeNote />
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Your name" htmlFor="su-name"><Input id="su-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Julian" /></Field>
          <Field label="Email" htmlFor="su-email"><Input id="su-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password" htmlFor="su-password" hint="At least 8 characters."><Input id="su-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" size="lg" loading={loading} icon={<ArrowRight className="h-4 w-4" />}>Create account</Button>
        </form>
        <DemoButton />
      </AuthLayout>
    </GuestOnly>
  );
}

export function ResetPasswordView() {
  const { requestPasswordReset, updatePassword, backend, status } = useAuth();
  const nav = useNav();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"request" | "update" | "done">(() => (backend === "supabase" && status === "signed-in" ? "update" : "request"));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const r = await requestPasswordReset(email);
    setLoading(false);
    if (!r.ok) setError(r.error);
    else { setMessage(r.message ?? null); if (backend === "local") setStage("update"); }
  };
  const update = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const r = await updatePassword(password, email);
    setLoading(false);
    if (!r.ok) setError(r.error);
    else setStage("done");
  };

  return (
    <AuthLayout title="Reset your password" subtitle={backend === "supabase" ? "We'll email you a secure link to choose a new password." : "Accounts in demo mode live in this browser, so you can set a new password here."} footer={<Link href="/login" className="font-medium text-mint-ink hover:underline">Back to sign in</Link>}>
      {stage === "done" ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <Penguin mood="cheer" size={90} />
          <p className="text-sm text-ink">Your password has been updated.</p>
          <Button onClick={() => nav.replace("/login")}>Sign in</Button>
        </div>
      ) : stage === "request" ? (
        <form onSubmit={request} className="flex flex-col gap-4" noValidate>
          {error && <ErrorNote>{error}</ErrorNote>}
          {message && <InfoNote tone="mint">{message}</InfoNote>}
          <Field label="Email" htmlFor="rp-email"><Input id="rp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit" size="lg" loading={loading}>{backend === "supabase" ? "Send reset link" : "Continue"}</Button>
        </form>
      ) : (
        <form onSubmit={update} className="flex flex-col gap-4" noValidate>
          {error && <ErrorNote>{error}</ErrorNote>}
          {message && <InfoNote tone="mint">{message}</InfoNote>}
          <Field label="New password" htmlFor="rp-new" hint="At least 8 characters."><Input id="rp-new" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" size="lg" loading={loading}>Save new password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
