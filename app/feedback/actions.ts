"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireApprovedMember } from "@/lib/auth/member";
import { createStorageAdminClient } from "@/lib/supabase/admin";

const feedbackSchema = z.object({
  category: z.enum(["feature_request", "trade_barter", "giveaway", "bug", "general"]),
  rating: z.coerce.number().int().min(1).max(5),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(3000),
  anonymous: z.boolean(),
});

const categoryLabels: Record<string, string> = {
  feature_request: "Feature Request",
  trade_barter: "Trade / Barter Idea",
  giveaway: "Giveaway Suggestion",
  bug: "Bug Report",
  general: "General Feedback",
};

export async function submitPlatformFeedback(formData: FormData) {
  const parsed = feedbackSchema.safeParse({
    category: formData.get("category"),
    rating: formData.get("rating"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    anonymous: formData.get("anonymous") === "on",
  });

  if (!parsed.success) {
    redirect("/feedback?error=invalid_input");
  }

  const { supabase, userId, profile } = await requireApprovedMember("/feedback");
  const adminDb = createStorageAdminClient();
  const db = adminDb ?? supabase;

  const { category, rating, subject, message, anonymous } = parsed.data;

  const { error: insertError } = await db.from("platform_feedbacks").insert({
    user_id: anonymous ? null : userId,
    college_id: profile.college_id,
    category,
    rating,
    subject,
    message,
    is_anonymous: anonymous,
    status: "open",
  });

  if (insertError) {
    console.error("[feedback] Failed saving platform feedback:", insertError.message);
    redirect("/feedback?error=feedback");
  }

  // Notify verified non-suspended admins for the member's college (plus super admins)
  if (adminDb) {
    try {
      const categoryTitle = categoryLabels[category] ?? "Campus Feedback";
      const senderLabel = anonymous
        ? "Anonymous Campus Member"
        : `${profile.full_name} (@${profile.handle})`;

      let adminQuery = adminDb
        .from("profiles")
        .select("id, role, college_id")
        .in("role", ["college_admin", "super_admin"])
        .eq("verification_status", "approved")
        .is("suspended_at", null);

      if (profile.college_id) {
        adminQuery = adminQuery.or(`role.eq.super_admin,college_id.eq.${profile.college_id}`);
      } else {
        adminQuery = adminQuery.eq("role", "super_admin");
      }

      const { data: admins } = await adminQuery.limit(20);
      const adminRows = (admins ?? []).map((admin) => ({
        user_id: admin.id,
        kind: "system" as const,
        title: `${categoryTitle} (${rating}/5)`,
        body: `${senderLabel}: "${subject}" — ${message.slice(0, 240)}`,
        payload: {
          feedback_category: category,
          rating,
          subject,
          sender_id: anonymous ? null : userId,
          college_id: profile.college_id,
          url: "/admin/feedback",
        },
      }));

      adminRows.push({
        user_id: userId,
        kind: "system" as const,
        title: "Campus Feedback Received",
        body: `Thank you for sharing feedback on "${subject}". Campus administrators review every submission.`,
        payload: {
          feedback_category: category,
          rating,
          subject,
          sender_id: userId,
          college_id: profile.college_id,
          url: "/feedback",
        },
      });

      await adminDb.from("notifications").insert(adminRows);
    } catch (notifyErr) {
      console.warn("[feedback] Notification dispatch warning:", notifyErr);
    }
  }

  revalidatePath("/admin/feedback");
  revalidatePath("/feedback");
  redirect("/feedback?success=1");
}
