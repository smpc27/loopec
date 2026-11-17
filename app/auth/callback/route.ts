import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createStorageAdminClient } from "@/lib/supabase/admin";
import { NITC_COLLEGE_ID } from "@/lib/auth/member";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/marketplace";
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL("/setup", request.url));
  const { searchParams, origin } = request.nextUrl;

  // Handle any OAuth provider errors gracefully
  const oauthError = searchParams.get("error");
  if (oauthError) {
    console.error("LOOPEC_OAUTH_CALLBACK_ERROR:", oauthError, searchParams.get("error_description"));
    return NextResponse.redirect(new URL("/auth/sign-in?error=sign_in", origin));
  }

  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/auth/sign-in?error=expired", origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("LOOPEC_EXCHANGE_CODE_ERROR:", error.message);
    return NextResponse.redirect(new URL("/auth/sign-in?error=expired", origin));
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

  return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin));
}
