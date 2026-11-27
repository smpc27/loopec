import Link from "next/link";
import { ArrowLeft, MessageSquareHeart, Star } from "lucide-react";
import { AuthShell, FormNotice } from "@/components/auth/auth-shell";
import { authMessage } from "@/lib/auth/messages";
import { getCurrentMember, isAdminProfile } from "@/lib/auth/member";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createStorageAdminClient } from "@/lib/supabase/admin";
import { AdminHeader } from "@/components/admin/admin-header";
import { reviewFeedback } from "@/app/admin/actions";

export const instant = false;

type FeedbackRow = {
  id: string;
  user_id: string | null;
  college_id: string | null;
  category: string;
  rating: number;
  subject: string;
  message: string;
  is_anonymous: boolean;
  status: "open" | "reviewed" | "resolved";
  admin_notes: string | null;
  created_at: string;
};

const categoryLabels: Record<string, string> = {
  feature_request: "Feature request",
  trade_barter: "Trade & barter",
  giveaway: "Giveaway drive",
  bug: "Bug report",
  general: "General",
};

export default async function AdminFeedbackPage({
  searchParams,
}: PageProps<"/admin/feedback">) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;

  if (!isSupabaseConfigured()) {
    return (
      <AuthShell
        eyebrow="Campus feedback"
        title="Pilot setup is incomplete"
        description="Connect Supabase to view submitted campus feedback."
      >
        <Link href="/setup" className="font-semibold text-violet-800">
          View setup details
        </Link>
      </AuthShell>
    );
  }

  const member = await getCurrentMember();
  if (!member.userId || !isAdminProfile(member.profile)) {
    return (
      <AuthShell
        eyebrow="Restricted area"
        title="College administrators only"
        description="Only verified campus administrators can review student feedback."
      >
        <Link href="/admin/login" className="font-semibold text-violet-800">
          Admin sign in
        </Link>
      </AuthShell>
    );
  }

  const adminProfile = member.profile!;
  const db = createStorageAdminClient() ?? member.supabase;
  let query = db
    .from("platform_feedbacks")
    .select(
      "id, user_id, college_id, category, rating, subject, message, is_anonymous, status, admin_notes, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (adminProfile.role !== "super_admin" && adminProfile.college_id) {
    query = query.eq("college_id", adminProfile.college_id);
  }

  const { data: feedbackData, error } = await query;
  const rows = (feedbackData ?? []) as FeedbackRow[];
  const userIds = [
    ...new Set(
      rows
        .filter((r) => !r.is_anonymous && r.user_id)
        .map((r) => r.user_id!)
    ),
  ];
  const { data: profilesData } = userIds.length
    ? await db.from("profiles").select("id, full_name, handle").in("id", userIds)
    : { data: [] };
  const profiles = new Map(
    ((profilesData ?? []) as { id: string; full_name: string; handle: string }[]).map((p) => [
      p.id,
      p,
    ])
  );

  return (
    <main className="min-h-screen bg-[#eee9e2] px-5 py-8 sm:px-8 text-[#241e14]">
      <AdminHeader
        adminName={adminProfile.full_name}
        isSuperAdmin={adminProfile.role === "super_admin"}
      />
      <section className="mx-auto mt-11 max-w-6xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#77717e] hover:text-violet-900"
        >
          <ArrowLeft size={14} /> Admin home
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-5 border-b border-[#e8e5e2] pb-7">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-violet-700">
              <MessageSquareHeart size={14} /> Student voice
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-[-.05em] text-[#28232f]">
              Platform feedback
            </h1>
            <p className="mt-2 text-sm text-[#77717e]">
              Bug reports, feature ideas, and campus feedback submitted by verified members.
            </p>
          </div>
          <span className="rounded-full border border-[#e8e3ec] bg-white px-4 py-2 text-xs font-semibold text-[#5e5765]">
            {rows.filter((r) => r.status === "open").length} open · {rows.length} total
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {errorCode ? <FormNotice>{authMessage(errorCode)}</FormNotice> : null}
          {params.updated ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Feedback status updated.
            </p>
          ) : null}
          {error ? (
            <FormNotice>
              Could not load feedback queue ({error.message}).
            </FormNotice>
          ) : null}

          {!error && rows.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-[#d9d2e0] bg-white px-6 py-14 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-800">
                <MessageSquareHeart size={22} />
              </span>
              <h2 className="mt-4 font-serif text-2xl text-[#28232f]">
                No feedback submissions yet
              </h2>
              <p className="mt-2 text-sm text-[#77717e]">
                Student ideas and bug reports from /feedback will appear here.
              </p>
            </div>
          ) : null}

          {rows.map((item) => {
            const author = !item.is_anonymous && item.user_id ? profiles.get(item.user_id) : null;
            return (
              <article
                key={item.id}
                className="grid gap-5 rounded-[24px] border border-[#e8e5e2] bg-white p-5 sm:grid-cols-[minmax(0,1fr)_280px] sm:p-6"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase text-violet-800">
                      {categoryLabels[item.category] ?? item.category}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                        item.status === "resolved"
                          ? "bg-emerald-50 text-emerald-800"
                          : item.status === "reviewed"
                          ? "bg-amber-50 text-amber-900"
                          : "bg-rose-50 text-rose-800"
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      <Star size={12} className="fill-amber-400 text-amber-500" />
                      {item.rating}/5
                    </span>
                    <span className="text-[11px] text-[#8d8691]">
                      {new Date(item.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <h2 className="mt-3 text-base font-bold text-[#28232f]">{item.subject}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f574d]">
                    {item.message}
                  </p>
                  <p className="mt-3 text-xs text-[#8b8590]">
                    Submitted by:{" "}
                    {item.is_anonymous
                      ? "Anonymous student"
                      : author
                      ? `${author.full_name} (@${author.handle})`
                      : "Campus member"}
                  </p>
                </div>

                <form action={reviewFeedback} className="space-y-2.5">
                  <input type="hidden" name="feedback_id" value={item.id} />
                  <label className="block text-xs font-semibold text-[#625b6b]">
                    Status
                    <select
                      name="status"
                      defaultValue={item.status}
                      className="mt-1.5 min-h-10 w-full rounded-xl border border-[#e4e0e8] bg-white px-3 text-xs font-semibold text-[#241e14]"
                    >
                      <option value="open">Open</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#625b6b]">
                    Admin notes
                    <textarea
                      name="admin_notes"
                      defaultValue={item.admin_notes ?? ""}
                      maxLength={1000}
                      rows={2}
                      placeholder="Optional triage note..."
                      className="mt-1.5 w-full resize-y rounded-xl border border-[#e4e0e8] p-2.5 text-xs outline-none focus:border-violet-500"
                    />
                  </label>
                  <button
                    type="submit"
                    className="min-h-10 w-full rounded-full bg-violet-950 px-4 text-xs font-semibold text-white hover:bg-violet-900 cursor-pointer"
                  >
                    Save status
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
