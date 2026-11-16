import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/verification";
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL("/setup", request.url));
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/auth/sign-in?error=expired", origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/sign-in?error=expired", origin));

  // Security check: restrict Google logins to institutional @nitc.ac.in domain
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  const email = user?.email?.toLowerCase().trim();
  if (email && user) {
    const domain = email.split("@").at(-1);
    if (domain !== "nitc.ac.in") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/auth/sign-in?error=domain", origin));
    }

    // Ensure profile exists for Google OAuth user
    const userId = user.id;
    const fullName = String(user.user_metadata?.full_name || user.user_metadata?.name || "Campus member").trim();
    const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!existingProfile) {
      await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName.slice(0, 120),
        handle: `member-${userId.replace(/-/g, "").slice(0, 12)}`,
        role: "student",
      });
    }
  }

  return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin));
}
