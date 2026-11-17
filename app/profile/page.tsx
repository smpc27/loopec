import Link from "next/link";
import { ArrowLeft, BadgeCheck, CircleUserRound } from "lucide-react";
import { connection } from "next/server";
import { AuthShell, FormNotice, inputClassName, labelClassName } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/lib/auth/member";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authMessage } from "@/lib/auth/messages";
import { signOut } from "@/app/auth/actions";
import { updateProfile } from "@/app/profile/actions";

export const instant = false;

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  await connection();
  const { error, saved } = await searchParams;
  const errorCode = Array.isArray(error) ? error[0] : error;
  if (!isSupabaseConfigured()) {
    return <AuthShell eyebrow="Your profile" title="Connect your campus" description="Profile management will be available when the pilot Supabase project is configured."><Link className="font-semibold text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]" href="/setup">View setup details</Link></AuthShell>;
  }

  const member = await getCurrentMember();
  if (!member.userId || !member.profile) {
    return <AuthShell eyebrow="Your profile" title="Sign in to continue" description="Manage your member profile after signing in."><Link className="font-semibold text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]" href="/auth/sign-in">Sign in to LOOPEC</Link></AuthShell>;
  }
  if (member.profile.suspended_at) {
    return <AuthShell eyebrow="Account access" title="Please contact your college admin" description="This account cannot update profile details right now."><Link className="font-semibold text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]" href="/auth/suspended">More about account access</Link></AuthShell>;
  }

  const status = member.profile.verification_status;
  const statusLabel = status === "approved" ? "Verified member" : status === "pending" ? "Verification pending" : status === "rejected" ? "Verification needs an update" : "Verification not submitted";
  return (
    <AuthShell
      eyebrow="Your account"
      title="Member profile"
      description="Update the name and contact details other verified members see. Your college role and access status can only be changed through admin review."
      footer={<div className="flex items-center justify-center gap-4"><Link className="font-semibold text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]" href={status === "approved" ? "/marketplace" : "/verification"}>Continue to {status === "approved" ? "marketplace" : "verification"}</Link><form action={signOut}><button className="font-semibold text-[#736b60] hover:text-[#241e14]" type="submit">Sign out</button></form></div>}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-[#d0c1ab]/50 bg-[#eee9e2]/60 p-4">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-[#241e14]"><CircleUserRound size={20} /></span>
          <span><b className="block text-sm text-[#241e14]">{statusLabel}</b><small className="mt-0.5 flex items-center gap-1 text-xs text-[#8e7a63]">{status === "approved" ? <><BadgeCheck size={13} /> Campus identity confirmed</> : "Access depends on college identity review"}</small></span>
        </div>
        {authMessage(errorCode) ? <FormNotice>{errorCode === "handle" ? "That handle is already in use. Choose another one." : authMessage(errorCode)}</FormNotice> : null}
        {saved ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your profile has been updated.</p> : null}
        <form action={updateProfile} className="space-y-4">
          <label className={labelClassName}>Full name<input className={inputClassName} name="full_name" autoComplete="name" minLength={2} maxLength={120} required defaultValue={member.profile.full_name} /></label>
          <label className={labelClassName}>Member handle<input className={inputClassName} name="handle" autoComplete="username" minLength={3} maxLength={32} pattern="[a-z0-9][a-z0-9-]{2,31}" required defaultValue={member.profile.handle} /><span className="mt-1.5 block text-xs font-normal text-[#8e7a63]">Lowercase letters, numbers and hyphens.</span></label>
          <label className={labelClassName}>Phone number <span className="font-normal text-[#8e7a63]">(optional)</span><input className={inputClassName} name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={member.profile.phone ?? ""} /></label>
          <label className={labelClassName}>
            Seller Payout UPI ID <span className="font-normal text-[#8e7a63]">(for receiving sales money directly)</span>
            <input
              className={inputClassName}
              name="upi_id"
              type="text"
              placeholder="e.g. 9876543210@paytm or yourname@oksbi"
              maxLength={50}
              defaultValue={member.profile.upi_id ?? ""}
            />
            <span className="mt-1.5 block text-xs font-normal text-[#8e7a63]">
              Buyers can send payments directly to this UPI ID or via WhatsApp upon campus handover.
            </span>
          </label>
          <label className={labelClassName}>About you <span className="font-normal text-[#8e7a63]">(optional)</span><textarea className={`${inputClassName} min-h-28 resize-y py-3`} name="bio" maxLength={500} defaultValue={member.profile.bio ?? ""} /></label>
          <Button className="w-full" size="lg" type="submit">Save profile</Button>
        </form>
        <div className="flex items-center justify-between pt-2 text-xs font-semibold text-[#736b60]">
          <Link className="inline-flex items-center gap-2 hover:text-[#241e14]" href="/marketplace"><ArrowLeft size={14} /> Back to marketplace</Link>
          <Link className="text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]" href="/feedback">Campus Feedback →</Link>
        </div>
      </div>
    </AuthShell>
  );
}
