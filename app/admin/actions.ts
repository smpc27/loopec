"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentMember, isAdminProfile } from "@/lib/auth/member";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { syncProductStatusInFirestore } from "@/lib/firebase/sync";
import { createStorageAdminClient } from "@/lib/supabase/admin";

async function requireAdminSession(superAdminOnly = false) {
  const member = await getCurrentMember();
  if (!member.userId) {
    redirect("/admin/login?error=session");
  }
  if (!isAdminProfile(member.profile) || (superAdminOnly && member.profile.role !== "super_admin")) {
    redirect("/admin/login?error=unauthorized");
  }
  return member as typeof member & { profile: NonNullable<typeof member.profile> };
}

export async function reviewVerification(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/setup");
  const parsed = z.object({
    verificationId: z.uuid(),
    decision: z.enum(["approved", "rejected"]),
    rejectionReason: z.string().trim().max(1000),
  }).safeParse({
    verificationId: formData.get("verification_id"),
    decision: formData.get("decision"),
    rejectionReason: formData.get("rejection_reason") ?? "",
  });
  if (!parsed.success || (parsed.data.decision === "rejected" && parsed.data.rejectionReason.length < 5)) {
    redirect("/admin?error=verification_review");
  }

  // Server Actions are directly callable, so re-read claims and the role on every request.
  const member = await requireAdminSession();

  const { error } = await member.supabase.rpc("review_verification", {
    p_verification_id: parsed.data.verificationId,
    p_decision: parsed.data.decision,
    p_rejection_reason: parsed.data.decision === "rejected" ? parsed.data.rejectionReason : null,
  });
  if (error) redirect("/admin?error=verification_review");
  redirect("/admin?reviewed=1");
}

export async function moderateProduct(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/setup");
  const parsed = z.object({
    productId: z.uuid(),
    decision: z.enum(["approved", "rejected", "removed"]),
    notes: z.string().trim().max(1000),
  }).safeParse({
    productId: formData.get("product_id"),
    decision: formData.get("decision"),
    notes: formData.get("moderator_notes") ?? "",
  });
  if (!parsed.success || (["rejected", "removed"].includes(parsed.data.decision) && parsed.data.notes.length < 5)) {
    redirect("/admin/listings?error=moderation");
  }

  const member = await requireAdminSession();

  const { error } = await member.supabase.rpc("moderate_product", {
    p_product_id: parsed.data.productId,
    p_decision: parsed.data.decision,
    p_moderator_notes: parsed.data.decision === "approved" ? null : parsed.data.notes,
  });
  if (error) redirect("/admin/listings?error=moderation");
  await syncProductStatusInFirestore(parsed.data.productId, parsed.data.decision);
  revalidatePath("/marketplace");
  revalidatePath(`/marketplace/${parsed.data.productId}`);
  revalidatePath("/listings");
  revalidatePath("/admin/listings");
  redirect("/admin/listings?reviewed=1");
}

export async function verifyManualPayment(formData: FormData) {
  const orderId = z.uuid().safeParse(formData.get("order_id"));
  if (!orderId.success) redirect("/admin/orders?error=payment_review");
  const member = await requireAdminSession();
  const { error } = await member.supabase.rpc("transition_order_status", {
    p_order_id: orderId.data,
    p_next_status: "paid",
  });
  if (error) redirect("/admin/orders?error=payment_review");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payouts");
  revalidatePath(`/orders/${orderId.data}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  redirect("/admin/orders?reviewed=1");
}

export async function rejectManualPayment(formData: FormData) {
  const parsed = z.object({ orderId: z.uuid(), reason: z.string().trim().min(5).max(1000) }).safeParse({
    orderId: formData.get("order_id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/admin/orders?error=payment_review");
  const member = await requireAdminSession();
  const { error } = await member.supabase.rpc("reject_manual_payment_reference", {
    p_order_id: parsed.data.orderId,
    p_reason: parsed.data.reason,
  });
  if (error) redirect("/admin/orders?error=payment_review");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  redirect("/admin/orders?rejected=1");
}

export async function setMemberSuspension(formData: FormData) {
  const parsed = z.object({
    userId: z.uuid(),
    suspend: z.enum(["true", "false"]),
    reason: z.string().trim().max(1000),
  }).safeParse({
    userId: formData.get("user_id"),
    suspend: formData.get("suspend"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success || (parsed.data.suspend === "true" && parsed.data.reason.length < 5)) {
    redirect("/admin/members?error=member_review");
  }
  const member = await requireAdminSession();
  const { error } = await member.supabase.rpc("set_member_suspension", {
    p_user_id: parsed.data.userId,
    p_suspend: parsed.data.suspend === "true",
    p_reason: parsed.data.suspend === "true" ? parsed.data.reason : null,
  });
  if (error) redirect("/admin/members?error=member_review");

  // Also sync Firestore so suspended seller listings are hidden or restored in Marketplace
  try {
    const adminDb = getFirebaseAdminDb();
    if (adminDb) {
      const sellerDocs = await adminDb.collection("products").where("seller_id", "==", parsed.data.userId).get();
      if (!sellerDocs.empty) {
        const batch = adminDb.batch();
        const nextStatus = parsed.data.suspend === "true" ? "removed" : "approved";
        for (const doc of sellerDocs.docs) {
          batch.set(doc.ref, { status: nextStatus, updated_at: new Date().toISOString() }, { merge: true });
        }
        await batch.commit();
      }
    }
  } catch (fsErr) {
    console.warn("[admin/actions] Failed syncing member suspension to Firestore:", fsErr);
  }

  revalidatePath("/admin/members");
  revalidatePath("/marketplace");
  redirect(parsed.data.suspend === "true" ? "/admin/members?suspended=1" : "/admin/members?reinstated=1");
}

export async function reviewReport(formData: FormData) {
  const parsed = z.object({
    reportId: z.uuid(),
    decision: z.enum(["under_review", "resolved", "dismissed"]),
    notes: z.string().trim().max(2000),
  }).safeParse({
    reportId: formData.get("report_id"),
    decision: formData.get("decision"),
    notes: formData.get("moderator_notes") ?? "",
  });
  if (!parsed.success) redirect("/admin/reports?error=review");
  const member = await requireAdminSession();
  const { error } = await member.supabase.rpc("review_report", {
    p_report_id: parsed.data.reportId,
    p_decision: parsed.data.decision,
    p_moderator_notes: parsed.data.notes || null,
  });
  if (error) redirect("/admin/reports?error=review");
  revalidatePath("/admin/reports");
  redirect("/admin/reports?updated=1");
}

async function requireSuperAdmin() {
  return await requireAdminSession(true);
}

export async function updateCommission(formData: FormData) {
  const percent = z.coerce.number().finite().min(0).max(100).safeParse(formData.get("percent"));
  if (!percent.success) redirect("/admin/settings?error=settings");
  const member = await requireSuperAdmin();
  const { error } = await member.supabase.rpc("update_commission_percent", { p_percent: Math.round(percent.data * 100) / 100 });
  revalidatePath("/admin/settings");
  redirect(error ? "/admin/settings?error=settings" : "/admin/settings?saved=1");
}

export async function addCategory(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().max(80),
  }).safeParse({ name: formData.get("name"), slug: formData.get("slug") ?? "" });
  if (!parsed.success) redirect("/admin/settings?error=category");
  const member = await requireSuperAdmin();
  const slug = (parsed.data.slug || parsed.data.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect("/admin/settings?error=category");
  const { data: lastCategory } = await member.supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sortOrder = Math.min(Number(lastCategory?.sort_order ?? 0) + 10, 32767);
  const { data: createdCat, error } = await member.supabase
    .from("categories")
    .insert({ name: parsed.data.name, slug, sort_order: sortOrder })
    .select("id, name, slug, sort_order")
    .maybeSingle();
  if (!error && createdCat) {
    try {
      const db = getFirebaseAdminDb();
      if (db) {
        await db.collection("categories").doc(createdCat.id).set(
          { id: createdCat.id, name: createdCat.name, slug: createdCat.slug, sort_order: createdCat.sort_order },
          { merge: true }
        );
      }
    } catch {}
  }
  revalidatePath("/admin/settings");
  revalidatePath("/marketplace");
  redirect(error ? "/admin/settings?error=category" : "/admin/settings?category_added=1");
}

export async function toggleCategory(formData: FormData) {
  const parsed = z.object({ categoryId: z.uuid(), active: z.enum(["true", "false"]) }).safeParse({
    categoryId: formData.get("category_id"),
    active: formData.get("active"),
  });
  if (!parsed.success) redirect("/admin/settings?error=category");
  const member = await requireSuperAdmin();
  const isActive = parsed.data.active === "true";
  const { error } = await member.supabase.from("categories").update({ is_active: isActive }).eq("id", parsed.data.categoryId);
  if (!error) {
    try {
      const db = getFirebaseAdminDb();
      if (db && !isActive) {
        await db.collection("categories").doc(parsed.data.categoryId).delete();
      }
    } catch {}
  }
  revalidatePath("/admin/settings");
  revalidatePath("/marketplace");
  redirect(error ? "/admin/settings?error=category" : "/admin/settings?category_saved=1");
}

export async function savePickupLocation(formData: FormData) {
  const parsed = z.object({
    locationId: z.union([z.literal(""), z.uuid()]),
    collegeId: z.uuid(),
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(3).max(300),
    instructions: z.string().trim().max(1200),
    sortOrder: z.coerce.number().int().min(-32768).max(32767),
    active: z.enum(["true", "false"]),
  }).safeParse({
    locationId: formData.get("location_id") ?? "",
    collegeId: formData.get("college_id"),
    name: formData.get("name"),
    address: formData.get("address"),
    instructions: formData.get("instructions") ?? "",
    sortOrder: formData.get("sort_order"),
    active: formData.get("is_active"),
  });
  if (!parsed.success) redirect("/admin/pickup?error=pickup");
  const member = await requireAdminSession();
  const collegeId = member.profile.role === "super_admin" ? parsed.data.collegeId : member.profile.college_id;
  if (!collegeId) redirect("/admin/pickup?error=pickup");
  const { error } = await member.supabase.rpc("manage_pickup_location", {
    p_location_id: parsed.data.locationId || null,
    p_college_id: collegeId,
    p_name: parsed.data.name,
    p_address: parsed.data.address,
    p_instructions: parsed.data.instructions,
    p_sort_order: parsed.data.sortOrder,
    p_is_active: parsed.data.active === "true",
  });
  revalidatePath("/admin/pickup");
  revalidatePath("/checkout");
  redirect(error ? "/admin/pickup?error=pickup" : "/admin/pickup?saved=1");
}

export async function reviewFeedback(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/setup");
  const parsed = z.object({
    feedbackId: z.string().uuid(),
    status: z.enum(["open", "reviewed", "resolved"]),
    adminNotes: z.string().trim().max(1000).optional(),
  }).safeParse({
    feedbackId: formData.get("feedback_id"),
    status: formData.get("status"),
    adminNotes: formData.get("admin_notes") ?? undefined,
  });
  if (!parsed.success) redirect("/admin/feedback?error=invalid");
  const member = await requireAdminSession();
  const db = createStorageAdminClient() ?? member.supabase;

  let query = db
    .from("platform_feedbacks")
    .update({
      status: parsed.data.status,
      ...(parsed.data.adminNotes !== undefined ? { admin_notes: parsed.data.adminNotes || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.feedbackId);

  if (member.profile.role !== "super_admin" && member.profile.college_id) {
    query = query.eq("college_id", member.profile.college_id);
  }

  const { error } = await query;
  revalidatePath("/admin/feedback");
  redirect(error ? "/admin/feedback?error=invalid" : "/admin/feedback?updated=1");
}
