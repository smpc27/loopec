import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AdminHeader } from "@/components/admin/admin-header";
import { getCurrentMember } from "@/lib/auth/member";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const instant = false;

type CompletedOrder = {
  id: string;
  seller_id: string;
  buyer_id: string;
  total_amount: number | string;
  commission_amount: number | string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  handle: string;
  phone: string | null;
  upi_id: string | null;
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function AdminPayoutsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AuthShell eyebrow="Admin Payouts" title="Connect Database" description="Configure Supabase to view platform settlements.">
        <Link href="/setup" className="font-semibold text-[#241e14] underline">View setup details</Link>
      </AuthShell>
    );
  }

  const member = await getCurrentMember();
  if (!member.userId || !member.profile || !["college_admin", "super_admin"].includes(member.profile.role)) {
    return (
      <AuthShell eyebrow="Restricted" title="Admin only" description="Only administrators can manage financial payouts.">
        <Link href="/" className="font-semibold text-[#241e14] underline">Return to home</Link>
      </AuthShell>
    );
  }

  const { data: orderData } = await member.supabase
    .from("orders")
    .select("id, seller_id, buyer_id, total_amount, commission_amount, status, created_at, updated_at")
    .in("status", ["paid", "ready_for_pickup", "completed"])
    .order("updated_at", { ascending: false });

  const orders = (orderData ?? []) as CompletedOrder[];
  const sellerIds = [...new Set(orders.map((o) => o.seller_id))];

  let profileData: Profile[] = [];
  if (sellerIds.length) {
    const res = await member.supabase.from("profiles").select("id, full_name, handle, phone, upi_id").in("id", sellerIds);
    if (res.error && (res.error.code === "42703" || res.error.message?.includes("upi_id"))) {
      const fb = await member.supabase.from("profiles").select("id, full_name, handle, phone").in("id", sellerIds);
      profileData = ((fb.data ?? []) as Omit<Profile, "upi_id">[]).map((p) => ({ ...p, upi_id: null }));
    } else {
      profileData = (res.data ?? []) as Profile[];
    }
  }

  const sellers = new Map(profileData.map((p) => [p.id, p]));

  let totalGrossVolume = 0;
  let totalPlatformCommission = 0;
  let totalSellerPayouts = 0;

  for (const o of orders) {
    const gross = Math.max(0, Number(o.total_amount) || 0);
    const fee = Math.max(0, Number(o.commission_amount) || 0);
    totalGrossVolume += gross;
    totalPlatformCommission += fee;
    totalSellerPayouts += Math.max(0, gross - fee);
  }

  return (
    <main className="min-h-screen bg-[#eee9e2] px-5 py-8 sm:px-8 text-[#241e14]">
      <AdminHeader
        adminName={member.profile.full_name}
        isSuperAdmin={member.profile.role === "super_admin"}
      />

      <section className="mx-auto mt-10 max-w-6xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-semibold text-[#736b60] hover:text-[#241e14]">
          <ArrowLeft size={14} /> Back to Admin overview
        </Link>

        <div className="mt-5 border-b border-[#d0c1ab]/50 pb-7">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#8e7a63]">
            <Wallet size={14} /> CiGaRa Group · Campus Settlements
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-.05em] text-[#241e14]">Payouts & UPI Settlement Ledger</h1>
          <p className="mt-2 text-sm leading-6 text-[#524a40]">
            Track confirmed campus orders, recorded platform fees, and direct UPI payouts to verified student sellers.
          </p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[22px] border border-[#d0c1ab]/60 bg-white p-5 shadow-xs">
            <small className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">Gross Marketplace Volume</small>
            <b className="mt-2 block font-serif text-3xl tracking-tight text-[#241e14]">{currency.format(totalGrossVolume)}</b>
            <p className="mt-1 text-xs text-[#736b60]">Total confirmed campus exchanges</p>
          </div>
          <div className="rounded-[22px] border border-[#d0c1ab]/60 bg-white p-5 shadow-xs">
            <small className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">Recorded Platform Fee</small>
            <b className="mt-2 block font-serif text-3xl tracking-tight text-[#241e14]">{currency.format(totalPlatformCommission)}</b>
            <p className="mt-1 text-xs text-[#736b60]">Per configured platform commission settings</p>
          </div>
          <div className="rounded-[22px] border border-emerald-200 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-xs">
            <small className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-800">Net Seller Value</small>
            <b className="mt-2 block font-serif text-3xl tracking-tight text-emerald-950">{currency.format(totalSellerPayouts)}</b>
            <p className="mt-1 text-xs text-emerald-800/80">Settled via WhatsApp & direct UPI</p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-[#d0c1ab]/60 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9e2] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#241e14]">Seller Settlement Directory</h2>
              <p className="text-xs text-[#736b60]">Confirmed paid and completed campus orders with seller UPI links</p>
            </div>
            <span className="rounded-full bg-[#eee9e2] px-3 py-1 text-xs font-semibold text-[#241e14]">
              {orders.length} orders
            </span>
          </div>

          {!orders.length ? (
            <div className="py-12 text-center text-sm text-[#736b60]">
              <p className="font-serif text-xl text-[#241e14]">No paid orders recorded yet.</p>
              <p className="mt-1 text-xs text-[#736b60]">Confirmed student exchanges and seller UPI links will appear here.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-[#eee9e2]">
              {orders.map((order) => {
                const seller = sellers.get(order.seller_id);
                const gross = Math.max(0, Number(order.total_amount) || 0);
                const fee = Math.max(0, Number(order.commission_amount) || 0);
                const net = Math.max(0, gross - fee);
                const upiLink = seller?.upi_id
                  ? `upi://pay?pa=${encodeURIComponent(seller.upi_id)}&pn=${encodeURIComponent(seller.full_name)}&am=${net}&cu=INR&tn=${encodeURIComponent(`LOOPEC Payout Order ${order.id.slice(0, 8)}`)}`
                  : null;

                return (
                  <div className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0" key={order.id}>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-sm font-semibold text-[#241e14]">{seller?.full_name ?? "Campus Seller"}</b>
                        <span className="rounded bg-[#eee9e2] px-2 py-0.5 text-[10px] text-[#524a40]">@{seller?.handle ?? "member"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${order.status === "completed" ? "bg-emerald-100 text-emerald-900" : "bg-[#eee9e2] text-[#241e14]"}`}>
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#736b60]">
                        Order #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-[#736b60]">Seller UPI:</span>
                        {seller?.upi_id ? (
                          <code className="rounded bg-[#eee9e2] px-2 py-0.5 font-mono font-semibold text-[#241e14]">
                            {seller.upi_id}
                          </code>
                        ) : (
                          <span className="text-amber-800">Not provided yet</span>
                        )}
                        {seller?.phone ? (
                          <span className="text-[#736b60]">· Phone: {seller.phone}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      <div>
                        <div className="text-xs text-[#736b60]">
                          Gross: <b>{currency.format(gross)}</b> · Fee: <b className="text-[#8e7a63]">{currency.format(fee)}</b>
                        </div>
                        <div className="text-base font-bold text-emerald-900">
                          Seller Net: {currency.format(net)}
                        </div>
                      </div>

                      {upiLink ? (
                        <a
                          href={upiLink}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-700 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 active:scale-95"
                        >
                          <Wallet size={13} /> Open UPI Pay ({currency.format(net)})
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#8e7a63]">
                          Waiting for seller to enter UPI ID in Profile
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
