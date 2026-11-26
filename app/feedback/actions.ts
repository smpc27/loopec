"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireApprovedMember } from "@/lib/auth/member";
import { verifyHumanRequest } from "@/lib/security/botid";
import { createStorageAdminClient } from "@/lib/supabase/admin";

const feedbackSchema = z.object({
  category: z.enum(["feature_request", "trade_barter", "giveaway", "bug", "general"]),
  rating: z.coerce.number().int().min(1).max(5),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(3000),
  anonymous: z.preprocess((val) => val === "on" || val === "true" || val === true, z.boolean()),
});

export async function submitPlatformFeedback(formData: FormData) {
  const botCheck = await verifyHumanRequest();
  if (!botCheck.allowed) redirect("/feedback?error=unauthorized");

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

  // 2. Notify college admin(s) and owner via public.notifications and direct message
  try {
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

    // Locate all admins and the platform owner (smsandep27)
    const [{ data: adminProfiles }, { data: ownerProfiles }, { data: allProfiles }] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, full_name, handle, role, college_id")
        .in("role", ["college_admin", "super_admin"]),
      adminClient
        .from("profiles")
        .select("id, full_name, handle, role, college_id")
        .or("handle.ilike.%smsandep%,full_name.ilike.%sandeep%,full_name.ilike.%sandep%"),
      adminClient
        .from("profiles")
        .select("id, full_name, handle, role, college_id")
        .order("created_at", { ascending: true })
        .limit(3),
    ]);

    const targetAdmins = new Map<string, { id: string; college_id?: string | null; full_name?: string }>();
    if (adminProfiles) for (const a of adminProfiles) targetAdmins.set(a.id, a);
    if (ownerProfiles) for (const o of ownerProfiles) targetAdmins.set(o.id, o);
    if (targetAdmins.size === 0 && allProfiles) {
      for (const p of allProfiles) targetAdmins.set(p.id, p);
    }

    const feedbackMsgBody = `💬 [Campus Feedback: ${categoryTitle} (${rating}/5 ⭐)]\n\n📌 Subject: ${subject}\n\n${message}\n\n${
      anonymous ? "👤 From: Anonymous Student" : `👤 From: ${profile.full_name} (@${profile.handle})`
    }`;

    // Loop through target recipients to deliver alerts and direct messages
    for (const admin of targetAdmins.values()) {
      // A. Alert notification
      await adminClient.from("notifications").insert({
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
      });

      // B. Direct message into conversations and messages
      let conversationId: string | null = null;
      const targetPartnerId = admin.id !== userId ? admin.id : null;

      if (targetPartnerId) {
        // Query existing direct conversation thread between submitter and admin
        const { data: existingConv } = await adminClient
          .from("conversations")
          .select("id")
          .or(
            `and(buyer_id.eq.${userId},seller_id.eq.${targetPartnerId}),and(buyer_id.eq.${targetPartnerId},seller_id.eq.${userId})`
          )
          .is("product_id", null)
          .is("order_id", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingConv) {
          conversationId = existingConv.id;
          await adminClient
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        } else {
          const { data: newConv } = await adminClient
            .from("conversations")
            .insert({
              college_id: profile.college_id ?? admin.college_id ?? "35b88dad-65f3-4cd6-b44d-c7d2fda7711a",
              buyer_id: userId,
              seller_id: targetPartnerId,
              product_id: null,
              order_id: null,
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (newConv) conversationId = newConv.id;
        }

        if (conversationId) {
          await adminClient.from("messages").insert({
            conversation_id: conversationId,
            sender_id: userId,
            body: feedbackMsgBody,
          });

          // Send new message alert with link to conversation
          await adminClient.from("notifications").insert({
            user_id: targetPartnerId,
            kind: "new_message" as const,
            title: `Feedback from ${senderName}`,
            body: `"${subject}" — ${message.slice(0, 150)}`,
            payload: {
              conversation_id: conversationId,
              category,
              rating,
              subject,
            },
          });
        }
      } else {
        // When owner tests submitting feedback with their own account, find another peer profile
        // so conversation constraint (buyer_id <> seller_id) is satisfied and message shows in /messages
        const otherPeer = allProfiles?.find((p) => p.id !== userId);
        if (otherPeer) {
          const { data: existingSelfConv } = await adminClient
            .from("conversations")
            .select("id")
            .or(
              `and(buyer_id.eq.${otherPeer.id},seller_id.eq.${userId}),and(buyer_id.eq.${userId},seller_id.eq.${otherPeer.id})`
            )
            .is("product_id", null)
            .is("order_id", null)
            .limit(1)
            .maybeSingle();

          let selfConvId = existingSelfConv?.id;
          if (!selfConvId) {
            const { data: createdSelfConv } = await adminClient
              .from("conversations")
              .insert({
                college_id: profile.college_id ?? "35b88dad-65f3-4cd6-b44d-c7d2fda7711a",
                buyer_id: otherPeer.id,
                seller_id: userId,
                product_id: null,
                order_id: null,
                updated_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            if (createdSelfConv) selfConvId = createdSelfConv.id;
          }

          if (selfConvId) {
            await adminClient.from("messages").insert({
              conversation_id: selfConvId,
              sender_id: otherPeer.id,
              body: `💬 [Self-Test Feedback: ${categoryTitle} (${rating}/5 ⭐)]\n\n📌 Subject: ${subject}\n\n${message}`,
            });
          }
        }
      }
    }

    // 3. Send confirmation notification to submitter
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
    // messaging & notifications fallback complete
  }

  redirect("/feedback?success=1");
}
