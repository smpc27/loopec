import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/marketplace";
}

function getTargetOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
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

  try {
    const supabase = await createClient();

    if (accessToken && token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: token,
      });

      if (error || !data.session) {
        console.warn("LOOPEC_SESSION_SYNC_SET_WARNING:", error?.message);
        // Fallback to refreshSession with the refresh token
        const { error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: token,
        });
        if (refreshError) {
          console.error("LOOPEC_SESSION_SYNC_REFRESH_ERROR:", refreshError);
        }
      }
    } else if (token) {
      const { error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: token,
      });
      if (refreshError) {
        console.error("LOOPEC_SESSION_SYNC_REFRESH_ERROR:", refreshError);
      }
    }

    // Verify session
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      console.warn("LOOPEC_SESSION_SYNC_USER_CHECK_FAILED");
    }
  } catch (err) {
    console.error("LOOPEC_SESSION_SYNC_FATAL:", err);
  }

  // Redirect to target path (e.g. /marketplace) with authenticated cookies set in WebView!
  return NextResponse.redirect(new URL(nextParam, targetOrigin));
}
