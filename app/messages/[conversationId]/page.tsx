import Link from "next/link";
import { ArrowLeft, BadgeCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { requireApprovedMember } from "@/lib/auth/member";
import { markConversationRead, sendMessage } from "@/app/messages/actions";
import { LiveMessageThread } from "@/components/messages/live-message-thread";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  order_id: string | null;
};
type Message = { id: string; sender_id: string; body: string; read_at: string | null; created_at: string; conversation_id: string };

export default async function ConversationPage({ params, searchParams }: PageProps<"/messages/[conversationId]">) {
  const [{ conversationId }, search] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId)) {
    notFound();
  }
  const { supabase, userId, profile } = await requireApprovedMember();
  const { data: conversationData } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, product_id, order_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversationData) notFound();
  const conversation = conversationData as Conversation;
  const otherId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
  const [{ data: personData }, { data: productData }, { data: messageData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, handle, role, verification_status").eq("id", otherId).maybeSingle(),
    conversation.product_id ? supabase.from("products").select("id, name").eq("id", conversation.product_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("messages").select("id, sender_id, body, read_at, created_at, conversation_id").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(200),
  ]);
  const person = personData as { id: string; full_name: string; handle: string; role: string; verification_status: string } | null;
  const product = productData as { id: string; name: string } | null;
  const messages = (messageData ?? []) as Message[];
  const unreadCount = messages.filter((message) => message.sender_id !== userId && !message.read_at).length;
  const searchValue = await search;
  const error = Array.isArray(searchValue.error) ? searchValue.error[0] : searchValue.error;

  return (
    <main className="min-h-screen bg-transparent">
      {/* Global Responsive Site Header */}
      <SiteHeader
        profile={profile}
        sectionTitle={person?.full_name ? `Chat with ${person.full_name}` : "Conversation"}
      />
      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3 border-b border-[#d0c1ab]/50 pb-5">
          <Link href="/messages" className="grid size-9 place-items-center rounded-full text-[#736b60] hover:bg-white" aria-label="Back to messages"><ArrowLeft size={16} /></Link>
          <Link href={person ? `/members/${person.handle}` : "/messages"} className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eee9e2] font-serif text-lg text-[#241e14]">{(person?.full_name ?? "M").slice(0, 1).toUpperCase()}</Link>
          <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#241e14]">{person?.full_name ?? "Campus member"}{person?.verification_status === "approved" ? <BadgeCheck size={14} className="shrink-0 text-[#241e14]" /> : null}</p><p className="mt-1 truncate text-xs text-[#736b60]">{product ? `About ${product.name}` : conversation.order_id ? "Order coordination" : "Campus Feedback & Support"}</p></div>
          <Link href={`/messages/${conversation.id}`} className="grid size-9 place-items-center rounded-full text-[#736b60] hover:bg-white hover:text-[#241e14]" aria-label="Refresh messages"><RefreshCw size={15} /></Link>
        </div>
        <LiveMessageThread conversationId={conversation.id} currentUserId={userId} initialMessages={messages} />
        {unreadCount ? <form action={markConversationRead} className="mb-3 text-right"><input type="hidden" name="conversation_id" value={conversation.id} /><button type="submit" className="text-xs font-semibold text-[#241e14] hover:underline">Mark {unreadCount} message{unreadCount === 1 ? "" : "s"} as read</button></form> : null}
        {error ? <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{error === "rate_limit" ? "You’ve sent several messages in a short time. Please wait a little before sending another." : "We couldn’t send that message. Please try again."}</p> : null}
        <form action={sendMessage} className="rounded-[22px] border border-[#d0c1ab]/50 bg-white p-2.5 shadow-sm">
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <label className="sr-only" htmlFor="message-body">Write a message</label>
          <div className="flex items-end gap-2"><textarea id="message-body" name="body" className="min-h-12 max-h-40 flex-1 resize-y rounded-2xl bg-[#eee9e2]/50 px-4 py-3 text-sm leading-5 outline-none focus:ring-4 focus:ring-[#d0c1ab]/30 text-[#241e14]" placeholder="Write a message…" maxLength={4000} required /><button type="submit" className="min-h-12 shrink-0 rounded-full bg-[#241e14] px-5 text-sm font-semibold text-white transition hover:bg-[#382f20]">Send</button></div>
        </form>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#736b60]"><ShieldCheck size={12} className="text-[#241e14]" /> Messages are only visible to this conversation’s members.</p>
      </section>
    </main>
  );
}
