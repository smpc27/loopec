import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/member";

export async function GET() {
  try {
    const member = await getCurrentMember().catch(() => null);
    if (!member?.userId) {
      return NextResponse.json({ unreadAlerts: 0, unreadMessages: 0 });
    }

    const { supabase, userId } = member;

    // 1. Fetch unread alerts count using the indexed notifications_unread_idx
    // 2. Fetch user's conversation IDs (only active threads, max 30)
    const [{ count: unreadAlerts }, { data: conversations }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
      supabase
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("updated_at", { ascending: false })
        .limit(30),
    ]);

    let unreadMessages = 0;
    const conversationIds = (conversations ?? []).map((c) => c.id);

    // Only count unread messages inside the user's own conversations to avoid table-scan RLS penalty
    if (conversationIds.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId)
        .is("read_at", null);
      unreadMessages = count ?? 0;
    }

    return NextResponse.json(
      {
        unreadAlerts: unreadAlerts ?? 0,
        unreadMessages: unreadMessages ?? 0,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json({ unreadAlerts: 0, unreadMessages: 0 });
  }
}
