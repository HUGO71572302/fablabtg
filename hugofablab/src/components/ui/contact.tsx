import { Mail, MessageCircle, Phone } from "lucide-react";

/**
 * Convertit un numéro local togolais en format international (228 + 8 chiffres) pour WhatsApp.
 * Laisse tel quel un numéro déjà complet (avec indicatif).
 */
export function whatsappNumber(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!d.startsWith("228") && d.length <= 9) d = "228" + d;
  return d;
}

export function telHref(phone: string): string {
  return `tel:+${whatsappNumber(phone)}`;
}

/** Boutons « Appeler » / « WhatsApp » / « Écrire » adaptés aux canaux disponibles. */
export function ContactButtons({
  phone,
  email,
  className = "",
  compact = false,
}: {
  phone?: string | null;
  email?: string | null;
  className?: string;
  compact?: boolean;
}) {
  if (!phone && !email) return null;
  const size = compact ? "min-h-8 px-2.5 text-xs gap-1.5" : "min-h-9 px-3 text-sm gap-2";
  return (
    <span className={className}>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {phone && (
          <>
            <a
              href={telHref(phone)}
              aria-label={`Appeler ${phone}`}
              title={`Appeler ${phone}`}
              className={`inline-flex items-center justify-center rounded-full border border-togo-green/40 bg-togo-green/10 text-togo-green transition hover:bg-togo-green/20 dark:text-lime ${compact ? "h-8 w-8" : "h-9 w-9"}`}
            >
              <Phone className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </a>
            <a
              href={`https://wa.me/${whatsappNumber(phone)}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Écrire sur WhatsApp au ${phone}`}
              title={`WhatsApp ${phone}`}
              className={`inline-flex items-center justify-center rounded-full bg-[#25D366] text-white transition hover:brightness-95 ${compact ? "h-8 w-8" : "h-9 w-9"}`}
            >
              <MessageCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </a>
          </>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            aria-label={`Écrire à ${email}`}
            title={`Écrire à ${email}`}
            className={`inline-flex items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-border ${compact ? "h-8 w-8" : "h-9 w-9"}`}
          >
            <Mail className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </a>
        )}
      </span>
      <span className="sr-only">{[phone, email].filter(Boolean).join(", ")}</span>
    </span>
  );
}
