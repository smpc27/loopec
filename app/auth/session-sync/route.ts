import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/marketplace";
  }
  if (/["'<>\\]/.test(value)) return "/marketplace";
  if (value.startsWith("/auth/session-sync") || value.startsWith("/auth/callback")) {
    return "/marketplace";
  }
  return value;
}

function getTargetOrigin(request: NextRequest) {
  const rawForwardedHost = request.headers.get("x-forwarded-host");
  const rawForwardedProto = request.headers.get("x-forwarded-proto");
  const proto = rawForwardedProto?.split(",")[0]?.trim() === "http" ? "http" : "https";
  if (rawForwardedHost) {
    const clean = rawForwardedHost.split(",")[0].trim().toLowerCase();
    if (
      /^[a-z0-9.-]+(?::\d+)?$/.test(clean) &&
      (clean === request.nextUrl.host.toLowerCase() ||
        clean === "loopec.in" ||
        clean === "www.loopec.in" ||
        clean.endsWith(".vercel.app") ||
        clean.startsWith("localhost:") ||
        clean === "localhost")
    ) {
      return `${proto}://${clean}`;
    }
  }
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const targetOrigin = getTargetOrigin(request);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/setup", targetOrigin));
  }

  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token") || searchParams.get("refresh_token");
  const accessToken = searchParams.get("access_token");
  const nextParam = safeNext(searchParams.get("next"));

  if (!token && !accessToken) {
    return NextResponse.redirect(new URL("/auth/sign-in?error=invalid_token", targetOrigin));
  }

  let hasValidUser = false;
  try {
    const supabase = await createClient();

    if (accessToken && token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: token,
      });

      if (error || !data.session) {
        console.warn("LOOPEC_SESSION_SYNC_SET_WARNING:", error?.message);
        await supabase.auth.refreshSession({ refresh_token: token }).catch(() => {});
      }
    } else if (token) {
      await supabase.auth.refreshSession({ refresh_token: token }).catch(() => {});
    }

    const { data: userData } = await supabase.auth.getUser();
    hasValidUser = Boolean(userData?.user);
  } catch (err) {
    console.error("LOOPEC_SESSION_SYNC_FATAL:", err);
  }

  if (!hasValidUser) {
    return NextResponse.redirect(
      new URL(`/auth/sign-in?next=${encodeURIComponent(nextParam)}&error=session`, targetOrigin)
    );
  }

  return NextResponse.redirect(new URL(nextParam, targetOrigin));
}
