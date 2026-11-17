import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck, RefreshCw } from "lucide-react";
import { requireApprovedMember } from "@/lib/auth/member";
import { markAllNotificationsRead, markNotificationRead } from "@/app/notifications/actions";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

type Notice = { id: string; kind: string; title: string; body: string; payload: Record<string, string>; read_at: string | null; created_at: string };

function hrefForNotice(notice: Notice) {
  if (notice.payload.order_id) return `/orders/${notice.payload.order_id}`;
  if (notice.payload.product_id) return `/marketplace/${notice.payload.product_id}`;
  if (notice.payload.conversation_id) return `/messages/${notice.payload.conversation_id}`;
  if (notice.kind === "verification") return "/verification";
  return null;
}

export default async function NotificationsPage() {
  const { supabase, userId, profile } = await requireApprovedMember();

  // Fast single query using index notifications_user_idx
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, payload, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  const notices = (data ?? []) as Notice[];
  const unread = notices.filter((notice) => !notice.read_at).length;

  return (
    <main className="min-h-screen bg-transparent">
      {/* Global Responsive Site Header */}
      <SiteHeader
        profile={profile}
        unreadAlertsCount={unread}
        sectionTitle="Alerts"
      />
      <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-xs font-semibold text-[#736b60] hover:text-[#241e14] transition"><ArrowLeft size={14} /> Marketplace</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">Campus updates</p><h1 className="mt-2 font-serif text-4xl tracking-[-.05em] text-[#241e14]">Notifications</h1><p className="mt-2 text-sm text-[#736b60]">Private updates about your listings, orders and messages.</p></div><div className="flex items-center gap-2"><Link href="/notifications" className="grid size-10 place-items-center rounded-full border border-[#d0c1ab]/60 bg-white text-[#736b60] hover:text-[#241e14]" aria-label="Refresh notifications"><RefreshCw size={15} /></Link>{unread ? <form action={markAllNotificationsRead}><button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d0c1ab] bg-white px-4 text-xs font-semibold text-[#241e14] hover:bg-[#eee9e2] shadow-sm transition" type="submit"><CheckCheck size={14} /> Mark all read</button></form> : null}</div></div>
        <div className="mt-7 overflow-hidden rounded-[24px] border border-[#d0c1ab]/50 bg-white/80 backdrop-blur-xl shadow-sm">
          {notices.length ? notices.map((notice, index) => {
            const href = hrefForNotice(notice);
            const content = <><span className={`mt-1.5 size-2 shrink-0 rounded-full ${notice.read_at ? "bg-transparent" : "bg-rose-600"}`} aria-hidden="true" /><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eee9e2] text-[#241e14]"><Bell size={17} /></span><span className="min-w-0 flex-1"><b className="block text-sm text-[#241e14]">{notice.title}</b><small className="mt-1 block text-xs leading-5 text-[#736b60]">{notice.body}</small><time className="mt-1.5 block text-[10px] text-[#8e7a63]" dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time></span></>;
            return <article className={`flex items-start gap-3 px-4 py-4 sm:px-5 ${index ? "border-t border-[#f0edf0]" : ""} ${notice.read_at ? "" : "bg-[#fcfbf9]"}`} key={notice.id}>{href ? <Link className="flex min-w-0 flex-1 items-start gap-3" href={href}>{content}</Link> : <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>}{!notice.read_at ? <form action={markNotificationRead}><input type="hidden" name="notification_id" value={notice.id} /><button className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-[#241e14] hover:bg-[#eee9e2]" type="submit">Read</button></form> : null}</article>;
          }) : <div className="px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14]"><Bell size={21} /></span><h2 className="mt-4 font-serif text-2xl text-[#241e14]">You’re all caught up</h2><p className="mt-2 text-sm text-[#736b60]">Updates will show here when something changes.</p></div>}
        </div>
      </section>
    </main>
  );
}
