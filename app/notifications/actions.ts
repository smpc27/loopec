"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth/member";

export async function markNotificationRead(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("notification_id"));
  if (!id.success) redirect("/notifications");
  const { supabase, userId } = await requireApprovedMember();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id.data).eq("user_id", userId);
  revalidatePath("/notifications");
  redirect("/notifications");
}

export async function markAllNotificationsRead() {
  const { supabase, userId } = await requireApprovedMember();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  revalidatePath("/notifications");
  redirect("/notifications");
}
