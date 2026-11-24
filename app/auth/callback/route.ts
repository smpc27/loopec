import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createStorageAdminClient } from "@/lib/supabase/admin";
import { NITC_COLLEGE_ID } from "@/lib/auth/member";

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
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL("/setup", targetOrigin));
  
  const { searchParams } = request.nextUrl;

  // Handle any OAuth provider errors gracefully
  const oauthError = searchParams.get("error");
  if (oauthError) {
    console.error("LOOPEC_OAUTH_CALLBACK_ERROR:", oauthError, searchParams.get("error_description"));
    return NextResponse.redirect(new URL("/auth/sign-in?error=sign_in", targetOrigin));
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let authSession: Session | null = null;

  // Exchange auth code or verify email confirmation token_hash
  if (code) {
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && exchangeData?.session) {
      authSession = exchangeData.session;
    } else if (error) {
      console.warn("LOOPEC_EXCHANGE_CODE_NOTE:", error.message);
      // If code was already consumed or has expired, check if session is already active
      const { data: sessionData } = await supabase.auth.getSession();
      authSession = sessionData?.session ?? null;
      if (!authSession) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          return NextResponse.redirect(new URL("/auth/sign-in?error=expired", targetOrigin));
        }
      }
    }
  } else if (tokenHash && type) {
    const { data: verifyData, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && verifyData?.session) {
      authSession = verifyData.session;
    } else if (error) {
      console.warn("LOOPEC_VERIFY_OTP_NOTE:", error.message);
      const { data: sessionData } = await supabase.auth.getSession();
      authSession = sessionData?.session ?? null;
      if (!authSession) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          return NextResponse.redirect(new URL("/auth/sign-in?error=expired", targetOrigin));
        }
      }
    }
  } else {
    // Neither code nor token_hash: check if already signed in
    const { data: sessionData } = await supabase.auth.getSession();
    authSession = sessionData?.session ?? null;
    if (!authSession) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return NextResponse.redirect(new URL("/auth/sign-in?error=expired", targetOrigin));
      }
    }
  }

  // Ensure member profile exists with approved instant access
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (user) {
      const email = (user.email ?? "").toLowerCase().trim();
      const isDevAdmin = email.includes("smsandep27") || email.includes("admin") || process.env.NODE_ENV === "development";
      const userId = user.id;
      const fullName = String(user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "Campus Member").trim();
      const handle = `member-${userId.replace(/-/g, "").slice(0, 12)}`;

      // Use admin client if available to bypass RLS, fallback to user client
      const adminClient = createStorageAdminClient();
      const db = adminClient || supabase;

      const { data: existingProfile } = await db.from("profiles").select("id, verification_status").eq("id", userId).maybeSingle();
      if (!existingProfile) {
        await db.from("profiles").upsert(
          {
            id: userId,
            full_name: fullName.slice(0, 120),
            handle,
            college_id: NITC_COLLEGE_ID,
            role: isDevAdmin ? "super_admin" : "student",
            verification_status: "approved",
          },
          { onConflict: "id" }
        );
      } else if (existingProfile.verification_status !== "approved") {
        await db.from("profiles").update({ verification_status: "approved", college_id: NITC_COLLEGE_ID }).eq("id", userId);
      }
    }
  } catch (profileError) {
    console.warn("LOOPEC_PROFILE_PROVISION_NOTE:", profileError);
    // Non-fatal: session is active, getCurrentMember provides fallback
  }

  const nextParam = safeNext(searchParams.get("next"));
  const source = searchParams.get("source");
  const userAgent = request.headers.get("user-agent") || "";
  const isFromAppWebView = userAgent.includes("LOOPEC-App");
  const isMobileBrowser = /android|iphone|ipad|ipod/i.test(userAgent) || source === "app";

  // If request is already executing directly inside the LOOPEC App WebView, redirect internally
  if (isFromAppWebView) {
    return NextResponse.redirect(new URL(nextParam, targetOrigin));
  }

  // If authenticated via mobile external browser (e.g. Chrome launched for Google SSO), hand off to LOOPEC Mobile App
  if (isMobileBrowser && authSession?.refresh_token) {
    const refreshToken = authSession.refresh_token;
    const accessToken = authSession.access_token || "";
    const syncQuery = `token=${encodeURIComponent(refreshToken)}&access_token=${encodeURIComponent(accessToken)}&next=${encodeURIComponent(nextParam)}`;

    // Host for intent: canonical Vercel production domain or custom domain
    const host = request.headers.get("x-forwarded-host") || request.nextUrl.host || "loopec-2w2s.vercel.app";
    const intentUrl = `intent://${host}/auth/session-sync?${syncQuery}#Intent;scheme=https;package=com.loopec.campus;end`;
    const customUrl = `loopec://auth/session-sync?${syncQuery}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Authenticating LOOPEC...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #eee9e2;
      color: #241e14;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px 16px;
      text-align: center;
    }
    .card {
      background: #ffffff;
      border: 1px solid #d0c1ab;
      border-radius: 28px;
      padding: 36px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(36, 30, 20, 0.08);
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: #eee9e2;
      border: 1px solid #d0c1ab;
      margin-bottom: 20px;
      font-size: 28px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3.5px solid #eee9e2;
      border-top-color: #241e14;
      border-radius: 50%;
      animation: spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      margin: 16px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #241e14;
      margin-bottom: 8px;
    }
    p {
      font-size: 14px;
      color: #736b60;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 52px;
      background-color: #241e14;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      border-radius: 16px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(36, 30, 20, 0.2);
      transition: transform 0.15s ease, background-color 0.15s ease;
      margin-bottom: 16px;
    }
    .btn:active {
      transform: scale(0.98);
      background-color: #000000;
    }
    .sublink {
      font-size: 13px;
      color: #8e7a63;
      text-decoration: underline;
      display: inline-block;
      padding: 6px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">🎓</div>
    <h1>Opening LOOPEC App...</h1>
    <div class="spinner"></div>
    <p>Sign-in complete! Returning you directly to the LOOPEC Mobile App.</p>
    <a href="${intentUrl}" id="app-btn" class="btn">Open LOOPEC App</a>
    <div>
      <a href="${nextParam}" class="sublink">Continue in browser instead</a>
    </div>
  </div>
  <script>
    (function() {
      var intentUrl = ${JSON.stringify(intentUrl)};
      var customUrl = ${JSON.stringify(customUrl)};
      var isAndroid = /android/i.test(navigator.userAgent);
      
      // Auto-trigger native app launch
      if (isAndroid) {
        window.location.href = intentUrl;
        setTimeout(function() {
          window.location.href = customUrl;
        }, 1200);
      } else {
        window.location.href = customUrl;
      }
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  // Pure desktop browser redirect
  return NextResponse.redirect(new URL(nextParam, targetOrigin));
}
