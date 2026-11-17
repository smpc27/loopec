import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  // If OAuth code arrives on root or any other page, redirect to callback immediately
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const callbackUrl = new URL("/auth/callback", request.url);
    for (const [key, val] of request.nextUrl.searchParams.entries()) {
      callbackUrl.searchParams.set(key, val);
    }
    if (!callbackUrl.searchParams.get("next")) {
      callbackUrl.searchParams.set("next", "/marketplace");
    }
    return NextResponse.redirect(callbackUrl);
  }

  const { url, publishableKey } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            // 30 days persistent token max-age (2,592,000s)
            maxAge: options?.maxAge ?? 60 * 60 * 24 * 30,
            sameSite: "lax",
            path: "/",
          });
        }
      },
    },
  });

  // getUser() refreshes the auth token via setAll cookies on incoming requests
  await supabase.auth.getUser();
  return response;
}
