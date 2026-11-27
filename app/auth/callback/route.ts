import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createStorageAdminClient } from "@/lib/supabase/admin";
import { NITC_COLLEGE_ID } from "@/lib/auth/member";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/marketplace";
  }
  if (/["'<>\\]/.test(value)) return "/marketplace";
  if (value.startsWith("/auth/callback") || value.startsWith("/auth/session-sync")) {
    return "/marketplace";
  }
  return value;
}

function isAllowedHost(host: string, requestHost: string) {
  const clean = host.split(",")[0].trim().toLowerCase();
  if (!clean || !/^[a-z0-9.-]+(?::\d+)?$/.test(clean)) return null;
  if (clean === requestHost.toLowerCase()) return clean;
  if (
    clean === "loopec.in" ||
    clean === "www.loopec.in" ||
    clean.endsWith(".vercel.app") ||
    clean.startsWith("localhost:") ||
    clean === "localhost"
  ) {
    return clean;
  }
  return null;
}

function getTargetOrigin(request: NextRequest) {
  const rawForwardedHost = request.headers.get("x-forwarded-host");
  const rawForwardedProto = request.headers.get("x-forwarded-proto");
  const proto = rawForwardedProto?.split(",")[0]?.trim() === "http" ? "http" : "https";
  if (rawForwardedHost) {
    const validHost = isAllowedHost(rawForwardedHost, request.nextUrl.host);
    if (validHost) {
      return `${proto}://${validHost}`;
    }
  }
  return request.nextUrl.origin;
}

function escapeHtmlAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET(request: NextRequest) {
  const targetOrigin = getTargetOrigin(request);
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL("/setup", targetOrigin));

  const { searchParams } = request.nextUrl;

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

  if (code) {
    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && exchangeData?.session) {
      authSession = exchangeData.session;
    } else if (error) {
      console.warn("LOOPEC_EXCHANGE_CODE_NOTE:", error.message);
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
    const { data: sessionData } = await supabase.auth.getSession();
    authSession = sessionData?.session ?? null;
    if (!authSession) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return NextResponse.redirect(new URL("/auth/sign-in?error=expired", targetOrigin));
      }
    }
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (user) {
      const email = (user.email ?? "").toLowerCase().trim();
      const emailDomain = email.split("@").at(-1)?.toLowerCase() ?? "";
      const userId = user.id;
      const fullName = String(
        user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0] || "Campus Member"
      ).trim();
      const handle = `member-${userId.replace(/-/g, "").slice(0, 12)}`;

      const adminClient = createStorageAdminClient();
      const db = adminClient || supabase;

      const [{ data: existingProfile }, { data: colleges }] = await Promise.all([
        db
          .from("profiles")
          .select("id, verification_status, suspended_at, college_id")
          .eq("id", userId)
          .maybeSingle(),
        db.from("colleges").select("id, email_domains").eq("is_active", true),
      ]);

      if (existingProfile?.suspended_at || existingProfile?.verification_status === "suspended") {
        return NextResponse.redirect(new URL("/auth/suspended", targetOrigin));
      }

      const matchedCollege = (colleges ?? []).find((college) =>
        ((college.email_domains as string[] | null) ?? []).some(
          (d) => d.trim().toLowerCase() === emailDomain
        )
      );

      if (!matchedCollege && existingProfile?.verification_status !== "approved") {
        await supabase.auth.signOut().catch(() => {});
        return NextResponse.redirect(new URL("/auth/sign-in?error=domain", targetOrigin));
      }

      const targetCollegeId = matchedCollege?.id || existingProfile?.college_id || NITC_COLLEGE_ID;

      if (!existingProfile) {
        await db.from("profiles").upsert(
          {
            id: userId,
            full_name: fullName.slice(0, 120),
            handle,
            college_id: targetCollegeId,
            role: "student",
            verification_status: "approved",
          },
          { onConflict: "id" }
        );
      } else if (
        existingProfile.verification_status !== "approved" &&
        existingProfile.verification_status !== "rejected"
      ) {
        await db
          .from("profiles")
          .update({ verification_status: "approved", college_id: targetCollegeId })
          .eq("id", userId);
      }
    }
  } catch (profileError) {
    console.warn("LOOPEC_PROFILE_PROVISION_NOTE:", profileError);
  }

  const nextParam = safeNext(searchParams.get("next"));
  const source = searchParams.get("source");
  const userAgent = request.headers.get("user-agent") || "";
  const isFromAppWebView = userAgent.includes("LOOPEC-App");

  // Only hand off via custom-scheme/Intent when OAuth was initiated by the native Capacitor shell
  if (isFromAppWebView) {
    return NextResponse.redirect(new URL(nextParam, targetOrigin));
  }

  if (source === "app" && authSession?.refresh_token) {
    const refreshToken = authSession.refresh_token;
    const accessToken = authSession.access_token || "";
    const syncQuery = `token=${encodeURIComponent(refreshToken)}&access_token=${encodeURIComponent(
      accessToken
    )}&next=${encodeURIComponent(nextParam)}`;

    const targetHost = new URL(targetOrigin).host;
    const intentUrl = `intent://${targetHost}/auth/session-sync?${syncQuery}#Intent;scheme=https;package=com.loopec.campus;end`;
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
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #241e14; margin-bottom: 8px; }
    p { font-size: 14px; color: #736b60; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: flex; align-items: center; justify-content: center;
      width: 100%; min-height: 52px; background-color: #241e14; color: #ffffff !important;
      font-size: 15px; font-weight: 700; border-radius: 16px; text-decoration: none;
      box-shadow: 0 4px 14px rgba(36, 30, 20, 0.2); margin-bottom: 16px;
    }
    .sublink { font-size: 13px; color: #8e7a63; text-decoration: underline; display: inline-block; padding: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">🎓</div>
    <h1>Opening LOOPEC App...</h1>
    <div class="spinner"></div>
    <p>Sign-in complete! Returning you directly to the LOOPEC Mobile App.</p>
    <a href="${escapeHtmlAttr(intentUrl)}" id="app-btn" class="btn">Open LOOPEC App</a>
    <div>
      <a href="${escapeHtmlAttr(nextParam)}" class="sublink">Continue in browser instead</a>
    </div>
  </div>
  <script>
    (function() {
      var intentUrl = ${JSON.stringify(intentUrl)};
      var customUrl = ${JSON.stringify(customUrl)};
      var isAndroid = /android/i.test(navigator.userAgent);
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
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.redirect(new URL(nextParam, targetOrigin));
}
