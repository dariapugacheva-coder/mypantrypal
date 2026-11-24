"use client";
import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cn, clamp } from "@/lib/utils";
import { Link } from "@/lib/nav";

/* ---------- Button ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-mint text-mint-on hover:bg-mint-strong hover:text-white shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:border-mint-strong hover:text-mint-ink",
  ghost: "text-muted hover:text-ink hover:bg-ice",
  danger: "bg-danger text-white hover:brightness-95",
  soft: "bg-mint-soft text-mint-ink hover:bg-mint hover:text-mint-on"
};
const sizeClass: Record<Size, string> = { sm: "h-9 px-3 text-sm gap-1.5", md: "h-11 px-4 text-sm gap-2", lg: "h-12 px-5 text-base gap-2" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn("inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap", variantClass[variant], sizeClass[size], className)}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant = "primary", size = "md", className, children, icon }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link href={href} className={cn("inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 whitespace-nowrap", variantClass[variant], sizeClass[size], className)}>
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-ice hover:text-ink", className)} {...rest}>
      {children}
    </button>
  );
}

/* ---------- Card ---------- */

export function Card({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" | "li" }) {
  return <Tag className={cn("min-w-0 rounded-2xl bg-surface p-5 shadow-card border border-line/60", className)}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-mint-ink">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink [text-wrap:balance]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------- Badge ---------- */

type Tone = "mint" | "danger" | "warning" | "neutral" | "sky";
const toneClass: Record<Tone, string> = {
  mint: "bg-mint-soft text-mint-ink", danger: "bg-danger-soft text-danger-ink", warning: "bg-sun-soft text-sun-ink", neutral: "bg-ice text-muted", sky: "bg-sky-soft text-sky-ink"
};
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", toneClass[tone], className)}>{children}</span>;
}

export function DemoTag({ className }: { className?: string }) {
  return <Badge tone="warning" className={cn("uppercase tracking-wide text-[10px]", className)}>Demo</Badge>;
}

/* ---------- Progress ---------- */

export function ProgressBar({ value, max = 1, tone = "mint", label, className }: { value: number; max?: number; tone?: "mint" | "danger" | "warning" | "sky"; label?: string; className?: string }) {
  const pct = clamp(max > 0 ? value / max : 0, 0, 1) * 100;
  const bar = tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-sun" : tone === "sky" ? "bg-sky-ink" : "bg-mint-strong";
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-ice", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, max, size = 92, stroke = 10, color = "rgb(var(--mint-strong))", children, label }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = clamp(max > 0 ? value / max : 0, 0, 1);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(var(--ice))" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/* ---------- Form fields ---------- */

export function Field({ label, hint, error, children, htmlFor, className }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">{label}</label>
      {children}
      {error ? <p className="text-xs text-danger-ink" role="alert">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const inputBase = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition focus:border-mint-strong focus:outline-none focus:ring-4 focus:ring-mint/25 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputBase, className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return <select ref={ref} className={cn(inputBase, "pr-8", className)} {...rest}>{children}</select>;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "h-auto min-h-[88px] py-2.5", className)} {...rest} />;
});

export function Toggle({ checked, onChange, label, description, id, hideLabel }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; id?: string; hideLabel?: boolean }) {
  const auto = useId();
  const tid = id ?? auto;
  return (
    <div className={cn("flex items-center justify-between gap-4", !hideLabel && "py-2")}>
      <label htmlFor={tid} className={cn("min-w-0 cursor-pointer", hideLabel && "sr-only")}>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
      <button
        id={tid}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-mint-strong" : "bg-line")}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </button>
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition", active ? "border-mint-strong bg-mint-soft text-mint-ink" : "border-line bg-surface text-muted hover:border-mint-strong hover:text-ink", className)}
    >
      {children}
    </button>
  );
}

/** Multi-select chips with an "add your own" input. */
export function ChipPicker({ options, value, onChange, addLabel = "Add another", idPrefix }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; addLabel?: string; idPrefix: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const all = Array.from(new Set([...options, ...value]));
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const add = () => {
    const v = inputRef.current?.value.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    if (inputRef.current) inputRef.current.value = "";
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">{all.map((o) => <Chip key={o} active={value.includes(o)} onClick={() => toggle(o)}>{o}</Chip>)}</div>
      <div className="flex gap-2">
        <Input ref={inputRef} id={`${idPrefix}-add`} placeholder={addLabel} aria-label={addLabel} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button variant="secondary" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, children, footer, size = "md", labelledBy }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "full"; labelledBy?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("input,select,textarea,button:not([data-close])")?.focus(), 30);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  const width = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : size === "full" ? "sm:max-w-5xl" : "sm:max-w-xl";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-[rgb(var(--shadow)/0.45)] backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? titleId}
        className={cn("relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-lift animate-rise sm:rounded-3xl", width)}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose} data-close><X className="h-5 w-5" /></IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel, loading }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm" footer={<><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <div className="text-sm text-muted">{message}</div>
    </Modal>
  );
}

/* ---------- States ---------- */

export function Spinner({ label = "Loading" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status"><Loader2 className="h-5 w-5 animate-spin text-mint-strong" />{label}</div>;
}

export function EmptyState({ title, body, action, art }: { title: string; body: string; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-ice/50 px-6 py-10 text-center">
      {art}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-ink">{children}</div>;
}

export function InfoNote({ children, tone = "sky", icon }: { children: ReactNode; tone?: "sky" | "sun" | "mint"; icon?: ReactNode }) {
  const c = tone === "sun" ? "bg-sun-soft text-sun-ink" : tone === "mint" ? "bg-mint-soft text-mint-ink" : "bg-sky-soft text-sky-ink";
  return <div className={cn("flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm", c)}>{icon}<div className="min-w-0">{children}</div></div>;
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold text-ink [text-wrap:balance]">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action, art }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        {art}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl [text-wrap:balance]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  );
}

export function Stat({ value, label, tone = "ink" }: { value: ReactNode; label: string; tone?: "ink" | "mint" | "danger" }) {
  const c = tone === "mint" ? "text-mint-ink" : tone === "danger" ? "text-danger-ink" : "text-ink";
  return (
    <div className="min-w-0">
      <div className={cn("text-2xl font-bold tabular-nums", c)}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : "img"} aria-label={`Rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role={onChange ? "radio" : undefined}
          aria-checked={onChange ? n === value : undefined}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className="rounded-md p-0.5 transition hover:scale-110 disabled:hover:scale-100"
        >
          <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8L12 2.5z" fill={n <= value ? "rgb(var(--sun))" : "transparent"} stroke={n <= value ? "rgb(var(--sun))" : "rgb(var(--line))"} strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}
