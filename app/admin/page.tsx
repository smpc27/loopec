import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BadgeCheck, CircleDollarSign, FileText, ShieldCheck, UsersRound } from "lucide-react";
import { AuthShell, FormNotice } from "@/components/auth/auth-shell";
import { authMessage } from "@/lib/auth/messages";
import { getCurrentMember } from "@/lib/auth/member";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { reviewVerification } from "@/app/admin/actions";
import { signOut } from "@/app/auth/actions";

export const instant = false;

type VerificationRequest = {
  id: string;
  user_id: string;
  college_id: string;
  requested_role: "student" | "faculty" | "staff";
  college_email: string;
  id_document_path: string;
  created_at: string;
};
type Transaction = { id: string; order_id: string; transaction_type: string; gross_amount: number | string; seller_net_amount: number | string; created_at: string };

function formatRole(role: VerificationRequest["requested_role"]) {
  return role === "staff" ? "College staff" : role[0].toUpperCase() + role.slice(1);
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { error, reviewed } = await searchParams;
  const errorCode = Array.isArray(error) ? error[0] : error;
  if (!isSupabaseConfigured()) {
    return (
      <AuthShell
        eyebrow="College administration"
        title="Pilot setup is incomplete"
        description="Admin review will be available once the pilot Supabase project is connected."
      >
        <Link className="font-semibold text-[#8e7a63] hover:text-[#241e14] underline" href="/setup">
          View setup details
        </Link>
      </AuthShell>
    );
  }

  const member = await getCurrentMember();
  if (!member.userId) {
    redirect("/admin/login");
  }
  if (!member.profile || !["college_admin", "super_admin"].includes(member.profile.role) || member.profile.suspended_at) {
    redirect("/admin/login?error=unauthorized");
  }

  let queueQuery = member.supabase
    .from("user_verifications")
    .select("id, user_id, college_id, requested_role, college_email, id_document_path, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (member.profile.role !== "super_admin" && member.profile.college_id) {
    queueQuery = queueQuery.eq("college_id", member.profile.college_id);
  }
  const { data: queueData, error: queueError } = await queueQuery;
  const queue = (queueData ?? []) as VerificationRequest[];
  const userIds = [...new Set(queue.map((row) => row.user_id))];
  const { data: profiles } = userIds.length
    ? await member.supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id as string, profile.full_name as string]));
  const links = await Promise.all(queue.map(async (item) => {
    const { data } = await member.supabase.storage
      .from("verification-documents")
      .createSignedUrl(item.id_document_path, 90);
    return [item.id, data?.signedUrl ?? null] as const;
  }));
  const documentUrls = new Map(links);
  const [memberCountResult, listingCountResult, orderCountResult, reportCountResult, transactionResult] = await Promise.all([
    member.supabase.from("profiles").select("id", { count: "exact", head: true }),
    member.supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "approved"),
    member.supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "accepted", "payment_pending", "paid", "ready_for_pickup"]),
    member.supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
    member.supabase.from("transactions").select("id, order_id, transaction_type, gross_amount, seller_net_amount, created_at").in("transaction_type", ["payment", "refund"]).order("created_at", { ascending: false }).limit(8),
  ]);
  const transactions = (transactionResult.data ?? []) as Transaction[];
  const transactionOrderIds = [...new Set(transactions.map((transaction) => transaction.order_id))];
  const transactionOrderQuery = transactionOrderIds.length
    ? await member.supabase.from("orders").select("id, buyer_id, seller_id").in("id", transactionOrderIds)
    : { data: [] };
  const transactionProfileIds = [...new Set((transactionOrderQuery.data ?? []).flatMap((order) => [order.buyer_id, order.seller_id]))];
  const transactionProfilesQuery = transactionProfileIds.length
    ? await member.supabase.from("profiles").select("id, full_name").in("id", transactionProfileIds)
    : { data: [] };
  const transactionOrders = new Map(((transactionOrderQuery.data ?? []) as { id: string; buyer_id: string; seller_id: string }[]).map((order) => [order.id, order]));
  const transactionProfiles = new Map(((transactionProfilesQuery.data ?? []) as { id: string; full_name: string }[]).map((profile) => [profile.id, profile.full_name]));

  return (
    <main className="min-h-screen bg-[#eee9e2] px-5 py-8 sm:px-8 text-[#241e14]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="text-sm font-extrabold tracking-[.14em] uppercase text-[#241e14]">LOOPEC <span className="font-normal tracking-normal text-[#8e7a63]">Admin</span></Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/admin/payouts" className="rounded-full border border-[#d0c1ab] bg-[#241e14] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#382f20] transition-colors">Payouts & 5% Fee</Link>
          <Link href="/admin/listings" className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#b8a58b] transition-colors">Listing moderation</Link>
          <Link href="/admin/orders" className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#b8a58b] transition-colors">Order review</Link>
          <Link href="/admin/members" className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#b8a58b] transition-colors">Member access</Link>
          <Link href="/admin/pickup" className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#b8a58b] transition-colors">Pickup points</Link>
          <Link href="/admin/reports" className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#b8a58b] transition-colors">Reports</Link>
          {member.profile.role === "super_admin" ? <Link href="/admin/settings" className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#b8a58b] transition-colors">Platform settings</Link> : null}
          <span className="hidden text-xs font-bold text-[#736b60] sm:block">{member.profile.full_name}</span>
          <form action={signOut}><button className="rounded-full border border-[#d0c1ab]/60 bg-white/90 px-4 py-2.5 text-xs font-bold text-[#524a40] hover:text-[#241e14] hover:border-[#b8a58b] transition-colors" type="submit">Sign out</button></form>
        </div>
      </header>
      <section className="mx-auto mt-12 max-w-6xl">
        <div className="flex flex-col gap-7 border-b border-[#d0c1ab]/50 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#8e7a63]"><ShieldCheck size={15} /> College operations</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-.05em] text-[#241e14] sm:text-5xl font-bold">Member verification</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#524a40]">Review campus ID documents and approve access for the college community.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#d0c1ab]/60 bg-white px-4 py-3 shadow-sm">
            <span className="grid size-10 place-items-center rounded-xl bg-[#eee9e2] text-[#241e14]"><UsersRound size={19} /></span>
            <span><b className="block text-lg text-[#241e14]">{queue.length}</b><small className="text-xs text-[#736b60]">pending review</small></span>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          {authMessage(errorCode) ? <FormNotice>{authMessage(errorCode)}</FormNotice> : null}
          {reviewed ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Verification decision saved.</p> : null}
          {queueError ? <FormNotice>We could not load the verification queue. Check that the migration is applied and your admin account is scoped to this college.</FormNotice> : null}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="College marketplace overview">
            {[
              { label: "Community members", value: memberCountResult.count ?? 0 },
              { label: "Live listings", value: listingCountResult.count ?? 0 },
              { label: "Open orders", value: orderCountResult.count ?? 0 },
              { label: "Open reports", value: reportCountResult.count ?? 0 },
            ].map((metric) => <div className="rounded-[20px] border border-[#d0c1ab]/60 bg-white p-4 shadow-sm" key={metric.label}><small className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8e7a63]">{metric.label}</small><b className="mt-2 block font-serif text-3xl tracking-tight text-[#241e14]">{metric.value}</b></div>)}
          </section>
          <section className="rounded-[22px] border border-[#d0c1ab]/60 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#8e7a63]"><CircleDollarSign size={14} /> Transactions</p><h2 className="mt-1 text-lg font-bold text-[#241e14]">Recent payment activity</h2></div><Link className="text-xs font-bold text-[#8e7a63] hover:text-[#241e14] underline" href="/admin/orders">Payment review</Link></div>
            {transactions.length ? <div className="mt-4 divide-y divide-[#eee9e2]">{transactions.map((transaction) => {
              const order = transactionOrders.get(transaction.order_id);
              const buyerName = order ? transactionProfiles.get(order.buyer_id) : null;
              const sellerName = order ? transactionProfiles.get(order.seller_id) : null;
              return <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0" key={transaction.id}><span><b className="block text-sm text-[#241e14]">{transaction.transaction_type === "refund" ? "Refund recorded" : "Payment verified"}</b><small className="mt-1 block text-xs text-[#736b60]">Order {transaction.order_id.slice(0, 8)} · {buyerName ?? "Buyer"} → {sellerName ?? "Seller"} · {new Date(transaction.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small></span><span className="text-right"><b className="block text-sm text-[#241e14]">₹{Number(transaction.gross_amount).toLocaleString("en-IN")}</b><small className="text-xs text-[#736b60]">Seller net ₹{Number(transaction.seller_net_amount).toLocaleString("en-IN")}</small></span></div>;
            })}</div> : <p className="mt-4 rounded-xl bg-[#eee9e2]/50 px-4 py-5 text-sm text-[#736b60]">Verified payments and refunds will appear here.</p>}
          </section>
          {!queueError && queue.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d0c1ab] bg-white px-6 py-14 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14]"><BadgeCheck size={22} /></span>
              <h2 className="mt-4 font-serif text-2xl font-bold text-[#241e14]">You’re all caught up</h2>
              <p className="mt-2 text-sm text-[#736b60]">New member submissions will appear here.</p>
            </div>
          ) : null}
          {queue.map((item) => (
            <article className="grid gap-5 rounded-3xl border border-[#d0c1ab]/60 bg-white p-5 shadow-md sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6" key={item.id}>
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-lg font-bold text-[#241e14]">{names.get(item.user_id) ?? "Campus member"}</h2>
                  <span className="rounded-full bg-[#eee9e2] px-2.5 py-1 text-[11px] font-bold text-[#241e14]">{formatRole(item.requested_role)}</span>
                </div>
                <p className="mt-1 text-sm text-[#736b60]">{item.college_email}</p>
                <p className="mt-2 text-xs text-[#8e7a63]">Submitted {new Date(item.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                {documentUrls.get(item.id) ? (
                  <a className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#8e7a63] hover:text-[#241e14] underline" href={documentUrls.get(item.id)!} target="_blank" rel="noreferrer">
                    <FileText size={16} /> Open private ID document <ArrowUpRight size={14} />
                  </a>
                ) : <p className="mt-4 text-xs font-medium text-rose-700">Document link unavailable. Check Storage policies.</p>}
              </div>
              <div className="flex flex-wrap gap-2 sm:max-w-[360px]">
                <form action={reviewVerification} className="flex flex-wrap gap-2 sm:justify-end">
                  <input type="hidden" name="verification_id" value={item.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button className="min-h-11 rounded-full bg-[#241e14] px-5 text-sm font-bold text-white transition hover:bg-[#382f20]" type="submit">Approve member</button>
                </form>
                <form action={reviewVerification} className="flex w-full flex-col gap-2 sm:items-end">
                  <input type="hidden" name="verification_id" value={item.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <label className="w-full text-left text-xs font-bold text-[#524a40]">Reason for rejection
                    <textarea className="mt-1.5 min-h-20 w-full resize-y rounded-xl border border-[#d0c1ab] p-3 text-sm outline-none focus:border-[#241e14] focus:ring-2 focus:ring-[#241e14]/10" name="rejection_reason" minLength={5} maxLength={1000} required />
                  </label>
                  <button className="min-h-10 rounded-full border border-rose-200 px-4 text-sm font-bold text-rose-800 transition hover:bg-rose-50" type="submit">Reject with reason</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
