// Envoi d'e-mails : utilise Resend si RESEND_API_KEY est défini, sinon mode démo (log serveur + code affiché à l'écran).
export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!mailConfigured()) {
    console.log(`[HUGO FABLAB · mail démo] → ${to} | ${subject}\n${html.replace(/<[^>]+>/g, "")}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "HUGO FABLAB <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) console.error("[mail] Resend a refusé l'envoi :", await res.text());
    return res.ok;
  } catch (e) {
    console.error("sendMail error", e);
    return false;
  }
}
