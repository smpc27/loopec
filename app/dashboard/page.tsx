import Link from "next/link";
import { ArrowRight, BadgeCheck, Bell, Box, CirclePlus, MessageCircle, PackageCheck, Store, TrendingUp, UserRound } from "lucide-react";
import { requireApprovedMember } from "@/lib/auth/member";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

type Listing = { id: string; name: string; price: number | string; status: string; created_at: string };
type Order = { id: string; buyer_id: string; status: string; total_amount: number | string; created_at: string };
type DashboardMetrics = { total_listings: number; active_listings: number; pending_listings: number; pending_orders: number; completed_orders: number; paid_sales: number | string; review_count: number; average_rating: number | string | null };
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function DashboardPage() {
  const { supabase, userId, profile } = await requireApprovedMember();
  const [{ data: listingsData, count: listingCount }, { data: ordersData, count: orderCount }, { data: metricsData }] = await Promise.all([
    supabase.from("products").select("id, name, price, status, created_at", { count: "exact" }).eq("seller_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("orders").select("id, buyer_id, status, total_amount, created_at", { count: "exact" }).eq("seller_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.rpc("seller_dashboard_metrics"),
  ]);
  const listings = (listingsData ?? []) as Listing[];
  const orders = (ordersData ?? []) as Order[];
  const metrics = ((metricsData ?? []) as DashboardMetrics[])[0];
  const [{ count: wishlistCount }, { count: unreadCount }] = await Promise.all([
    supabase.from("wishlists").select("product_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const activeListings = metrics?.active_listings ?? 0;
  const pendingOrders = metrics?.pending_orders ?? 0;
  const completedOrders = metrics?.completed_orders ?? 0;
  const paidSales = Number(metrics?.paid_sales ?? 0);
  const averageRating = metrics?.average_rating ? Number(metrics.average_rating) : null;
  const recentOrders = orders.slice(0, 5);
  const buyerIds = [...new Set(recentOrders.map((order) => order.buyer_id))];
  const { data: buyerData } = buyerIds.length ? await supabase.from("profiles").select("id, full_name").in("id", buyerIds) : { data: [] };
  const buyers = new Map(((buyerData ?? []) as { id: string; full_name: string }[]).map((buyer) => [buyer.id, buyer.full_name]));
  const needsReview = listings.filter((listing) => listing.status === "pending").length;

  return (
    <main className="min-h-screen bg-transparent">
      {/* Global Responsive Site Header */}
      <SiteHeader
        profile={profile}
        sectionTitle="Seller Studio"
      />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">
              <Store size={14} /> Seller studio
            </p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#241e14]">
              Good morning, {profile.full_name.split(" ")[0]}.
            </h1>
            <p className="mt-1.5 text-sm text-[#736b60]">Your campus listings and exchanges, in one place.</p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#241e14] px-5 text-sm font-semibold text-[#eee9e2] shadow-sm transition hover:bg-[#382f20]"
            href="/listings/new"
          >
            <CirclePlus size={15} /> Create a listing
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Box, label: "Total listings", value: metrics?.total_listings ?? listingCount ?? listings.length, href: "/listings", note: `${activeListings} currently live` },
            { icon: PackageCheck, label: "Pending orders", value: pendingOrders, href: "/orders", note: `${orderCount ?? orders.length} seller orders` },
            { icon: TrendingUp, label: "Sales paid", value: currency.format(paidSales), href: "/orders", note: `${completedOrders} handovers complete` },
            { icon: BadgeCheck, label: "Member rating", value: averageRating ? `${averageRating.toFixed(1)} / 5` : "New seller", href: `/members/${profile.handle}`, note: `${metrics?.review_count ?? 0} member reviews` },
          ].map(({ icon: Icon, label, value, href, note }) => (
            <Link
              className="rounded-[22px] border border-[#d0c1ab]/50 bg-white/90 p-4 shadow-xs transition hover:border-[#8e7a63] hover:bg-white sm:p-5"
              href={href}
              key={label}
            >
              <span className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-[#eee9e2] text-[#241e14]">
                  <Icon size={17} />
                </span>
                <ArrowRight size={14} className="text-[#8e7a63]" />
              </span>
              <small className="mt-4 block text-[11px] font-semibold text-[#736b60]">{label}</small>
              <b className="mt-1 block truncate text-xl font-semibold tracking-tight text-[#241e14] sm:text-2xl">{value}</b>
              <small className="mt-1 block text-[11px] text-[#8e7a63]">{note}</small>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
          <section className="rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 shadow-xs sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">Seller activity</p>
                <h2 className="mt-1 font-serif text-2xl tracking-tight text-[#241e14]">Recent orders</h2>
              </div>
              <Link className="text-xs font-semibold text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]" href="/orders">
                View all
              </Link>
            </div>
            {recentOrders.length ? (
              <div className="mt-4 divide-y divide-[#eee9e2]">
                {recentOrders.map((order) => (
                  <Link className="flex items-center gap-3 py-3 first:pt-0" href={`/orders/${order.id}`} key={order.id}>
                    <span className="grid size-9 place-items-center rounded-xl bg-[#eee9e2] text-[#241e14]">
                      <PackageCheck size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm text-[#241e14]">{buyers.get(order.buyer_id) ?? "Campus member"}</b>
                      <small className="mt-0.5 block text-xs text-[#736b60]">{order.status.replaceAll("_", " ")} · {new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small>
                    </span>
                    <b className="text-sm font-semibold text-[#241e14]">{currency.format(Number(order.total_amount))}</b>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#d0c1ab] bg-[#eee9e2]/30 px-5 py-9 text-center">
                <p className="font-serif text-xl text-[#241e14]">Your first order is on the way.</p>
                <p className="mt-1 text-xs text-[#736b60]">Approved campus listings will show up here.</p>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-[24px] bg-[#241e14] p-5 text-[#eee9e2] shadow-sm sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#d0c1ab]">Your seller profile</p>
              <h2 className="mt-2 font-serif text-2xl text-[#eee9e2]">{profile.full_name}</h2>
              <p className="mt-1 text-xs text-[#eee9e2]/75">@{profile.handle} · {profile.role}</p>
              <Link className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#d0c1ab] hover:text-white" href="/profile">
                Manage profile <ArrowRight size={14} />
              </Link>
            </div>
            <div className="rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 shadow-xs sm:p-6">
              <h2 className="text-sm font-bold text-[#241e14]">Quick links</h2>
              <div className="mt-3 space-y-1">
                <Link className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]" href="/listings">
                  <Box size={15} /> Manage listings <span className="ml-auto text-[#8e7a63]">{needsReview ? `${needsReview} in review` : ""}</span>
                </Link>
                <Link className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]" href="/orders">
                  <PackageCheck size={15} /> Orders
                </Link>
                <Link className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]" href="/messages">
                  <MessageCircle size={15} /> Messages
                </Link>
                <Link className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]" href="/notifications">
                  <Bell size={15} /> Alerts{unreadCount ? ` (${unreadCount})` : ""}
                </Link>
                <Link className="flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-[#5f574d] hover:bg-[#eee9e2]/60 hover:text-[#241e14]" href={`/members/${profile.handle}`}>
                  <UserRound size={15} /> Public member profile
                </Link>
              </div>
            </div>
          </aside>
        </div>
        <div className="mt-5 flex justify-end text-xs text-[#736b60]">
          {wishlistCount ?? 0} items saved to your wishlist · {listingCount ?? listings.length} listings found · {orderCount ?? orders.length} orders
        </div>
      </section>
    </main>
  );
}
