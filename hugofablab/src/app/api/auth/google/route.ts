import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateToken } from "@/lib/password";
import { googleRedirectUri, publicOriginFromRequest } from "@/lib/origin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = publicOriginFromRequest(req);
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${origin}/login?error=google_config`);
  }
  const state = generateToken(16);
  const store = await cookies();
  const secure = origin.startsWith("https://");
  const cookieOpts = { httpOnly: true, sameSite: secure ? ("none" as const) : ("lax" as const), secure, path: "/", maxAge: 600 };
  store.set("hf_oauth_state", state, cookieOpts);

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
