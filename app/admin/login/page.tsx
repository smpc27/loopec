import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck } from "lucide-react";
import { getCurrentMember, isAdminProfile } from "@/lib/auth/member";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signIn, signOut } from "@/app/auth/actions";
import { authMessage } from "@/lib/auth/messages";
import { FormNotice } from "@/components/auth/auth-shell";

export const instant = false;

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;

  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-[#eee9e2] text-[#241e14] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-[#d0c1ab]/60 bg-white/90 p-8 shadow-xl text-center backdrop-blur-xl">
          <div className="mx-auto size-12 rounded-2xl bg-[#241e14] text-[#eee9e2] grid place-items-center mb-4">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#241e14]">Setup Incomplete</h1>
          <p className="mt-2 text-sm text-[#736b60]">
            Database connection is not configured yet. Complete the pilot setup first.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#241e14] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#382f20] transition-colors"
          >
            Go to Setup
          </Link>
        </div>
      </main>
    );
  }

  const member = await getCurrentMember();

  // If already signed in as approved college admin or super admin, go straight to the admin dashboard
  if (member.userId && isAdminProfile(member.profile)) {
    redirect("/admin");
  }

  const isSuspendedSession =
    Boolean(member.userId && member.profile && (member.profile.suspended_at || member.profile.verification_status === "suspended"));

  const isSignedInWithoutAdminAccess =
    Boolean(member.userId && member.profile && !isAdminProfile(member.profile));

  return (
    <main className="min-h-screen bg-[#eee9e2] text-[#241e14] flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#d0c1ab]">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-extrabold tracking-[0.16em] uppercase text-[#241e14] hover:opacity-80 transition-opacity"
          >
            LOOPEC <span className="text-[#8e7a63] font-normal tracking-normal">Administration</span>
          </Link>
          <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#241e14]">
            Campus Admin Portal
          </h1>
          <p className="mt-2 text-sm text-[#524a40]">
            Sign in with authorized administrator credentials to review verification queues, listings, and payouts.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[#d0c1ab]/60 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-2xl">
          {errorCode && (
            <div className="mb-5">
              <FormNotice>
                {errorCode === "unauthorized"
                  ? "Your current account does not have administrator privileges."
                  : authMessage(errorCode) || "Unable to sign in. Please verify your admin credentials."}
              </FormNotice>
            </div>
          )}

          {isSignedInWithoutAdminAccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto size-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 grid place-items-center">
                <UserCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8e7a63]">Current Session</p>
                <p className="text-base font-bold text-[#241e14] mt-1">{member.profile?.full_name}</p>
                <p className="text-xs text-[#736b60]">Role: {member.profile?.role}</p>
              </div>
              <p className="text-xs text-amber-900 bg-amber-50/80 p-3 rounded-xl border border-amber-200/60 text-left">
                {isSuspendedSession
                  ? "This session is currently suspended and cannot access the admin console."
                  : member.profile?.verification_status !== "approved"
                  ? "This session is not approved yet and cannot access the admin console."
                  : "This account is recognized as a campus member, but does not have college administrator or super administrator permissions."}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[#241e14] text-white py-3 text-sm font-bold hover:bg-[#382f20] transition-colors cursor-pointer"
                  >
                    Sign Out & Switch Account
                  </button>
                </form>
                <Link
                  href="/"
                  className="w-full rounded-full border border-[#d0c1ab] py-2.5 text-xs font-bold text-[#524a40] hover:bg-[#eee9e2]/50 transition-colors"
                >
                  Return to Campus Marketplace
                </Link>
              </div>
            </div>
          ) : (
            <form action={signIn} className="space-y-4">
              <input type="hidden" name="next" value="/admin" />
              <input type="hidden" name="redirect_to" value="/admin/login" />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#524a40] mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736b60]">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="admin@nitc.ac.in"
                    className="w-full rounded-2xl border border-[#d0c1ab] bg-white pl-10 pr-4 py-3 text-sm text-[#241e14] placeholder-[#736b60]/50 outline-none focus:border-[#241e14] focus:ring-2 focus:ring-[#241e14]/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#524a40]">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-semibold text-[#8e7a63] hover:text-[#241e14]"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#736b60]">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••••••"
                    className="w-full rounded-2xl border border-[#d0c1ab] bg-white pl-10 pr-4 py-3 text-sm text-[#241e14] placeholder-[#736b60]/50 outline-none focus:border-[#241e14] focus:ring-2 focus:ring-[#241e14]/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#241e14] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#382f20] active:scale-[0.99] transition-all"
              >
                Sign in to Admin Console
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#d0c1ab]/40 text-center">
            <Link
              href="/"
              className="text-xs font-bold text-[#736b60] hover:text-[#241e14] transition-colors"
            >
              ← Back to Campus Store
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
