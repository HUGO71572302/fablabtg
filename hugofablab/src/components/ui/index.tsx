import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ArrowUpRight, Award, CircleDot, Leaf, Sprout } from "lucide-react";
import type { Level, ReservationStatus, ResourceStatus } from "@/db/schema";
import { LEVEL_LABEL, RESOURCE_STATUS_LABEL, STATUS_LABEL } from "@/lib/labels";

export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "warning";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "border border-transparent bg-primary text-primary-foreground hover:brightness-110",
  secondary: "border border-transparent bg-muted text-foreground hover:bg-border",
  outline: "border border-border bg-transparent text-foreground hover:border-togo-green/40 hover:bg-muted/60",
  ghost: "border border-transparent text-foreground hover:bg-muted",
  danger: "border border-transparent bg-togo-red text-white hover:brightness-110",
  success: "border border-transparent bg-togo-green text-white hover:brightness-110",
  warning: "border border-transparent bg-lime text-forest hover:bg-togo-yellow/70",
};
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-4 text-base gap-2",
  lg: "min-h-[50px] px-6 text-base gap-2.5",
  icon: "h-11 w-11",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-w-0 rounded-[20px] border border-border bg-card text-card-foreground surface-shadow", className)}>{children}</div>;
}

export function CardHeader({
  title,
  eyebrow,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  eyebrow?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[13px] font-bold uppercase tracking-[0.16em] text-togo-green dark:text-lime">{eyebrow}</p>}
        <h2 className="text-[19px] font-extrabold leading-snug tracking-[-0.015em]">{title}</h2>
        {subtitle ? <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 pb-5 pt-4 sm:px-6 sm:pb-6", className)}>{children}</div>;
}

/** Micro-label de formulaire : ancre visuelle forte, valeur conservée en texte normal à côté. */
export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-2 block text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground", className)}>
      {children}
    </label>
  );
}

const fieldClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-base font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground/80 transition focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15 disabled:opacity-60";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-[100px] resize-y", className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "yellow" | "red" | "blue" | "outline";
  className?: string;
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    green: "bg-togo-green/10 text-togo-green dark:text-lime",
    yellow: "bg-togo-yellow/20 text-[#8b641a] dark:text-togo-yellow",
    red: "bg-togo-red/10 text-togo-red dark:text-red-300",
    blue: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    outline: "border border-border text-foreground",
  };
  return <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold leading-tight", tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const tone = status === "confirmee" ? "green" : status === "en_attente" ? "yellow" : "red";
  return (
    <Badge tone={tone}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "confirmee" ? "bg-togo-green dark:bg-lime" : status === "en_attente" ? "bg-amber-500" : "bg-togo-red")} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function LevelBadge({ level, className }: { level: Level; className?: string }) {
  const Icon = level === "expert" ? Award : level === "confirme" ? Leaf : Sprout;
  return (
    <Badge tone={level === "expert" ? "blue" : level === "confirme" ? "yellow" : "green"} className={className}>
      <Icon className="h-3 w-3" />
      {LEVEL_LABEL[level]}
    </Badge>
  );
}

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <Badge tone={status === "disponible" ? "green" : status === "maintenance" ? "yellow" : "neutral"}>
      <CircleDot className="h-3 w-3" />
      {RESOURCE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      {icon ? <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted text-togo-green dark:text-lime">{icon}</div> : null}
      <p className="text-base font-extrabold tracking-[-0.015em]">{title}</p>
      {text ? <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, eyebrow, subtitle, action }: { title: string; eyebrow?: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.18em] text-togo-green dark:text-lime">{eyebrow}</p>}
        <h1 className="text-[34px] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-[42px]">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-[15px] font-medium leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, accent = "neutral" }: { label: string; value: ReactNode; hint?: string; accent?: "green" | "yellow" | "red" | "neutral" }) {
  const color =
    accent === "green" ? "bg-togo-green/10 text-togo-green dark:text-lime" : accent === "yellow" ? "bg-togo-yellow/20 text-amber-700 dark:text-togo-yellow" : accent === "red" ? "bg-togo-red/10 text-togo-red" : "bg-muted text-muted-foreground";
  return (
    <div className="min-w-0 rounded-[18px] border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-lg", color)}>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-2 text-[13px] font-medium text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
