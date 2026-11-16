"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireApprovedMember } from "@/lib/auth/member";
import { createStorageAdminClient } from "@/lib/supabase/admin";

const feedbackSchema = z.object({
  category: z.enum(["feature_request", "trade_barter", "giveaway", "bug", "general"]),
  rating: z.coerce.number().int().min(1).max(5),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(3000),
  anonymous: z.preprocess((val) => val === "on" || val === "true" || val === true, z.boolean()),
});

export async function submitPlatformFeedback(formData: FormData) {
  const { supabase, userId, profile } = await requireApprovedMember();

  const parsed = feedbackSchema.safeParse({
    category: formData.get("category"),
    rating: formData.get("rating"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    anonymous: formData.get("anonymous"),
  });

  if (!parsed.success) {
    redirect("/feedback?error=invalid_input");
  }

  const { category, rating, subject, message, anonymous } = parsed.data;
  const adminClient = createStorageAdminClient() ?? supabase;

  // 1. Attempt to save in a dedicated feedback table if exists, or ignore if table not created
  try {
    await adminClient.from("platform_feedbacks").insert({
      user_id: anonymous ? null : userId,
      college_id: profile.college_id,
      category,
      rating,
      subject,
      message,
      is_anonymous: anonymous,
    });
  } catch {
    // Ignore schema cache or missing table error; we will notify admins directly
  }

  // 2. Notify college admin(s) via public.notifications
  try {
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("college_id", profile.college_id ?? "00000000-0000-0000-0000-000000000000")
      .in("role", ["college_admin", "super_admin"]);

    const categoryTitle =
      category === "feature_request"
        ? "💡 Feature Suggestion"
        : category === "trade_barter"
        ? "🔄 Trade / Barter Feedback"
        : category === "giveaway"
        ? "🎁 Giveaway Feedback"
        : category === "bug"
        ? "🐞 Bug Report"
        : "⭐ General Platform Feedback";

    const senderName = anonymous ? "An anonymous peer" : `${profile.full_name} (@${profile.handle})`;

    if (adminProfiles && adminProfiles.length > 0) {
      const adminNotifications = adminProfiles.map((admin) => ({
        user_id: admin.id,
        kind: "system" as const,
        title: `${categoryTitle} (${rating}/5)`,
        body: `${senderName}: "${subject}" — ${message.slice(0, 300)}`,
        payload: {
          feedback_category: category,
          rating,
          subject,
          message,
          sender_id: anonymous ? null : userId,
          college_id: profile.college_id,
        },
      }));

      await adminClient.from("notifications").insert(adminNotifications);
    }

    // 3. Send confirmation notification to user
    await adminClient.from("notifications").insert({
      user_id: userId,
      kind: "system" as const,
      title: "Campus Feedback Received",
      body: `Thank you for sharing your feedback on "${subject}". Our campus team reviews all student submissions to improve LOOPEC.`,
      payload: {
        category,
        rating,
        subject,
      },
    });
  } catch {
    // notifications fallback complete
  }

  redirect("/feedback?success=1");
}
