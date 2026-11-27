import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createStorageAdminClient } from "@/lib/supabase/admin";

export const NITC_COLLEGE_ID = "35b88dad-65f3-4cd6-b44d-c7d2fda7711a";

export type MemberProfile = {
  id: string;
  full_name: string;
  handle: string;
  phone: string | null;
  bio: string | null;
  college_id: string | null;
  role: "student" | "faculty" | "staff" | "college_admin" | "super_admin";
  verification_status:
    | "not_submitted"
    | "pending"
    | "approved"
    | "rejected"
    | "suspended";
  suspended_at: string | null;
  upi_id?: string | null;
};

export async function getCurrentMember() {
  if (!isSupabaseConfigured()) redirect("/setup");

  // Fast-path: Check cookies first before doing any remote network calls
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  const supabase = await createClient();
  if (!hasAuthCookie) {
    return { supabase, userId: null, profile: null };
  }

  let userId: string | null = null;

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (!claimsError && claimsData?.claims?.sub) {
    userId = String(claimsData.claims.sub);
  } else {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData?.user?.id) {
      userId = userData.user.id;
    }
  }

  if (!userId) {
    return { supabase, userId: null, profile: null };
  }

  let { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, handle, phone, bio, college_id, role, verification_status, suspended_at, upi_id")
    .eq("id", userId)
    .maybeSingle();

  // Resilient fallback if profiles.upi_id migration hasn't been applied in Supabase yet
  if (error && (error.code === "42703" || error.message?.includes("upi_id"))) {
    const fallbackRes = await supabase
      .from("profiles")
      .select("id, full_name, handle, phone, bio, college_id, role, verification_status, suspended_at")
      .eq("id", userId)
      .maybeSingle();
    data = fallbackRes.data ? { ...fallbackRes.data, upi_id: null } : null;
    error = fallbackRes.error;
  }

  let profile = (error || !data) ? null : (data as MemberProfile);

  // Auto-provision profile from Google OAuth user metadata if row is missing
  if (!profile) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const email = user?.email ?? "";
    const fullName = String(
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.preferred_username ||
      email.split("@")[0] ||
      "NITC Campus Member"
    ).trim();
    const handle = `member-${userId.replace(/-/g, "").slice(0, 12)}`;

    try {
      const db = createStorageAdminClient() || supabase;
      const { data: created } = await db
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: fullName.slice(0, 120),
            handle,
            role: "student",
            college_id: NITC_COLLEGE_ID,
            verification_status: "approved",
          },
          { onConflict: "id" }
        )
        .select("id, full_name, handle, phone, bio, college_id, role, verification_status, suspended_at")
        .maybeSingle();

      if (created) {
        profile = { ...created, upi_id: null } as MemberProfile;
      }
    } catch {}

    if (!profile) {
      profile = {
        id: userId,
        full_name: fullName.slice(0, 120),
        handle,
        phone: null,
        bio: null,
        college_id: NITC_COLLEGE_ID,
        role: "student",
        verification_status: "approved",
        suspended_at: null,
        upi_id: null,
      };
    }
  }

  return {
    supabase,
    userId,
    profile,
  };
}

export function isAdminProfile(profile: MemberProfile | null | undefined): profile is MemberProfile {
  return Boolean(
    profile &&
      ["college_admin", "super_admin"].includes(profile.role) &&
      profile.verification_status === "approved" &&
      !profile.suspended_at
  );
}

export async function requireAdminMember(superAdminOnly = false) {
  const member = await getCurrentMember();
  if (!member.userId) {
    redirect("/admin/login?error=session");
  }
  if (!member.profile || member.profile.suspended_at || member.profile.verification_status === "suspended") {
    redirect("/auth/suspended");
  }
  if (!isAdminProfile(member.profile) || (superAdminOnly && member.profile.role !== "super_admin")) {
    redirect("/admin/login?error=unauthorized");
  }
  return {
    supabase: member.supabase,
    userId: member.userId,
    profile: member.profile,
  };
}

export async function requireApprovedMember(nextPath = "/marketplace") {
  // 1. Check for real active Supabase authenticated session
  const member = await getCurrentMember();
  if (member.userId && member.profile) {
    if (member.profile.suspended_at || member.profile.verification_status === "suspended") {
      redirect("/auth/suspended");
    }
    if (member.profile.verification_status === "rejected") {
      redirect("/verification");
    }

    const activeProfile = { ...member.profile };
    const needsCollege = !activeProfile.college_id;
    const needsApproval = activeProfile.verification_status !== "approved";

    // Sync missing college_id / approved verification into Postgres so RLS policies
    // (app_private.is_approved_member) allow creating listings, messages, and orders.
    if (needsCollege || needsApproval) {
      if (needsCollege) activeProfile.college_id = NITC_COLLEGE_ID;
      const adminDb = createStorageAdminClient();
      if (adminDb) {
        try {
          await adminDb
            .from("profiles")
            .update({
              college_id: activeProfile.college_id || NITC_COLLEGE_ID,
              ...(needsApproval ? { verification_status: "approved" } : {}),
            })
            .eq("id", member.userId);
          if (needsApproval) activeProfile.verification_status = "approved";
        } catch {}
      } else if (needsCollege) {
        try {
          await member.supabase
            .from("profiles")
            .update({ college_id: NITC_COLLEGE_ID })
            .eq("id", member.userId);
        } catch {}
      }
    }

    if (activeProfile.verification_status !== "approved") {
      redirect("/verification");
    }

    // For authenticated active campus members, grant instant marketplace access
    return {
      supabase: member.supabase,
      userId: member.userId,
      profile: {
        ...activeProfile,
        college_id: activeProfile.college_id || NITC_COLLEGE_ID,
        verification_status: "approved" as const,
      },
    };
  }

  // 2. Fallback only if no real session exists and dev bypass is enabled (for smoke tests)
  if (process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true") {
    const supabase = await createClient();
    const userId = "00000000-0000-4000-8000-000000000001";
    const profile: MemberProfile = {
      id: userId,
      full_name: "Sandep (NITC Member)",
      handle: "sandep-nitc",
      phone: null,
      bio: "NITC Student & Campus Trader",
      college_id: NITC_COLLEGE_ID,
      role: "student",
      verification_status: "approved",
      suspended_at: null,
      upi_id: "sandep@okaxis",
    };
    return { supabase, userId, profile };
  }

  const safeTarget =
    nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.startsWith("/\\")
      ? nextPath
      : "/marketplace";
  redirect(`/auth/sign-in?next=${encodeURIComponent(safeTarget)}&error=session`);
}
