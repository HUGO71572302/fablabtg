"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/components/ui";

export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 select-all overflow-x-auto break-all rounded-xl border border-border bg-muted px-3 py-2 text-[13px] font-medium">{value}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            });
          }}
          aria-label={`Copier : ${label}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition",
            copied ? "border-togo-green bg-togo-green/10 text-togo-green" : "border-border hover:bg-muted",
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
