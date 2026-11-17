import Link from "next/link";
import { ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";
import { requireApprovedMember } from "@/lib/auth/member";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

type ConversationRow = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  order_id: string | null;
  updated_at: string;
};

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const { supabase, userId, profile } = await requireApprovedMember();
  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, product_id, order_id, updated_at")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false })
    .limit(30);
  const conversations = (conversationData ?? []) as ConversationRow[];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const userIds = [...new Set(conversations.map((conversation) => conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id))];
  const productIds = [...new Set(conversations.map((conversation) => conversation.product_id).filter((id): id is string => Boolean(id)))];
  const [{ data: profileData }, { data: productData }, { data: unreadData }, { data: messageData }, { count: unreadAlerts }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id, full_name, handle").in("id", userIds) : Promise.resolve({ data: [] }),
    productIds.length ? supabase.from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: [] }),
    conversationIds.length ? supabase.from("messages").select("conversation_id").in("conversation_id", conversationIds).neq("sender_id", userId).is("read_at", null) : Promise.resolve({ data: [] }),
    conversationIds.length ? supabase.from("messages").select("conversation_id, body, sender_id, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const profiles = new Map(((profileData ?? []) as { id: string; full_name: string; handle: string }[]).map((item) => [item.id, item]));
  const products = new Map(((productData ?? []) as { id: string; name: string }[]).map((item) => [item.id, item.name]));
  const unreadCounts = new Map<string, number>();
  for (const row of (unreadData ?? []) as { conversation_id: string }[]) unreadCounts.set(row.conversation_id, (unreadCounts.get(row.conversation_id) ?? 0) + 1);
  const latest = new Map<string, { body: string; sender_id: string }>();
  for (const row of (messageData ?? []) as { conversation_id: string; body: string; sender_id: string }[]) if (!latest.has(row.conversation_id)) latest.set(row.conversation_id, row);

  const totalUnreadMessages = Array.from(unreadCounts.values()).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-transparent">
      {/* Global Responsive Site Header */}
      <SiteHeader
        profile={profile}
        unreadAlertsCount={unreadAlerts ?? 0}
        unreadMessagesCount={totalUnreadMessages}
        sectionTitle="Messages"
      />
      <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-xs font-semibold text-[#736b60] hover:text-[#241e14]"><ArrowLeft size={14} /> Marketplace</Link>
        <div className="mt-6 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">Member conversations</p><h1 className="mt-2 font-serif text-4xl tracking-[-.05em] text-[#241e14]">Messages</h1></div><Link href="/messages" className="grid size-10 place-items-center rounded-full border border-[#d0c1ab]/60 bg-white text-[#736b60] hover:text-[#241e14]" aria-label="Refresh messages"><RefreshCw size={15} /></Link></div>
        {error ? <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">We couldn’t send that message. Try again.</p> : null}
        <div className="mt-7 overflow-hidden rounded-[24px] border border-[#d0c1ab]/50 bg-white/80 backdrop-blur-xl shadow-sm">
          {conversations.length ? conversations.map((conversation, index) => {
            const otherId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
            const person = profiles.get(otherId);
            const lastMessage = latest.get(conversation.id);
            const unread = unreadCounts.get(conversation.id) ?? 0;
            return (
              <div className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${index ? "border-t border-[#f0edf0]" : ""}`} key={conversation.id}>
                <Link href={`/messages/${conversation.id}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eee9e2] font-serif text-lg text-[#241e14]">{(person?.full_name ?? "M").slice(0, 1).toUpperCase()}</Link>
                <Link href={`/messages/${conversation.id}`} className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><b className="truncate text-sm text-[#241e14]">{person?.full_name ?? "Campus member"}</b>{unread ? <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">{unread}</span> : null}</span>
                  <small className="mt-1 block truncate text-xs text-[#736b60]">{conversation.product_id ? products.get(conversation.product_id) ?? "Campus listing" : conversation.order_id ? "Order conversation" : "Campus Support & Feedback"}{lastMessage ? ` · ${lastMessage.sender_id === userId ? "You: " : ""}${lastMessage.body}` : " · Start the conversation"}</small>
                </Link>
                <Link className="grid size-9 shrink-0 place-items-center rounded-full text-[#736b60] hover:bg-[#eee9e2] hover:text-[#241e14]" href={`/messages/${conversation.id}`} aria-label="Open conversation"><MessageCircle size={17} /></Link>
              </div>
            );
          }) : (
            <div className="px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14]"><MessageCircle size={21} /></span><h2 className="mt-4 font-serif text-2xl text-[#241e14]">No conversations yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#736b60]">Open a listing and choose Message seller to coordinate privately about an item, or submit campus feedback.</p></div>
          )}
        </div>
      </section>
    </main>
  );
}
