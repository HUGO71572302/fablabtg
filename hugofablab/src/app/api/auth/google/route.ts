import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateToken } from "@/lib/password";
import { googleRedirectUri, publicOriginFromRequest } from "@/lib/origin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = publicOriginFromRequest(req);
  const passwordReset = new URL(req.url).searchParams.get("flow") === "reset";
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${origin}${passwordReset ? "/recuperer-mot-de-passe?error=google_config" : "/login?error=google_config"}`);
  }
  const state = generateToken(16);
  const store = await cookies();
  const secure = origin.startsWith("https://");
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 600 };
  store.set("hf_oauth_state", state, cookieOpts);
  store.delete("hf_password_reset");
  if (passwordReset) store.set("hf_oauth_flow", "password-reset", cookieOpts);
  else store.delete("hf_oauth_flow");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
