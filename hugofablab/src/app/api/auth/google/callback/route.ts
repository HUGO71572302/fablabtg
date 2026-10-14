import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { googleRedirectUri, publicOriginFromRequest } from "@/lib/origin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = publicOriginFromRequest(req);
  const fail = (reason = "google") => NextResponse.redirect(`${origin}/login?error=${reason}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expected = store.get("hf_oauth_state")?.value;
  store.delete("hf_oauth_state");
  if (url.searchParams.get("error")) return fail("google_denied");
  if (!code || !state || state !== expected) return fail("google_state");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google_config");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleRedirectUri(req),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error("[google] token exchange failed", detail);
      return fail(/redirect_uri|mismatch/i.test(detail) ? "google_mismatch" : "google_token");
    }
    const token = (await tokenRes.json()) as { access_token: string };
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!infoRes.ok) return fail("google_profile");
    const info = (await infoRes.json()) as { sub: string; email?: string; name?: string; email_verified?: boolean };
    if (!info.email) return fail("google_profile");
    const email = info.email.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId: number;
    if (existing) {
      if (!existing.active) return fail("disabled");
      // Le rôle existant est conservé tel quel (jamais modifié par Google).
      await db.update(users).set({ googleId: info.sub, emailVerified: true }).where(eq(users.id, existing.id));
      userId = existing.id;
    } else {
      // Connexion Google réservée aux comptes existants (responsables) : aucune création automatique.
      return fail("google_unknown");
    }
    await createSession(userId);
    const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    return NextResponse.redirect(`${origin}${u?.role === "fabmanager" ? "/admin" : "/app"}`);
  } catch (e) {
    console.error("[google] callback error", e);
    return fail("google");
  }
}
