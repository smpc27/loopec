"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth/member";
import { verifyHandoverPin } from "@/lib/orders/handover";
import { createStorageAdminClient } from "@/lib/supabase/admin";
import { syncProductStatusInFirestore } from "@/lib/firebase/sync";

function getSafeOrderRedirectPrefix(rawOrderId: FormDataEntryValue | null) {
  const valid = z.string().uuid().safeParse(rawOrderId);
  return valid.success ? `/orders/${valid.data}` : "/orders";
}

async function syncOrderProductsInFirestore(orderId: string) {
  const adminDb = createStorageAdminClient();
  if (!adminDb) return;
  const { data: orderItems } = await adminDb
    .from("order_items")
    .select("product_id, products(status, quantity)")
    .eq("order_id", orderId);

  for (const row of orderItems ?? []) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (
      row.product_id &&
      product &&
      (product.status === "approved" || product.status === "sold" || product.status === "removed" || product.status === "rejected" || product.status === "pending")
    ) {
      await syncProductStatusInFirestore(
        row.product_id,
        product.status,
        typeof product.quantity === "number" ? product.quantity : undefined
      );
    }
  }
}

export async function verifyCampusHandover(formData: FormData) {
  const rawOrderId = formData.get("order_id");
  const safePrefix = getSafeOrderRedirectPrefix(rawOrderId);

  const parsed = z.object({
    orderId: z.string().uuid(),
    pin: z.string().trim().regex(/^\d{4}$/),
  }).safeParse({
    orderId: rawOrderId,
    pin: formData.get("handover_pin"),
  });

  if (!parsed.success) {
    redirect(`${safePrefix}?error=invalid_pin`);
  }

  const { orderId, pin } = parsed.data;
  const { supabase, userId } = await requireApprovedMember();
  const { data: order } = await supabase
    .from("orders")
    .select("id, seller_id, buyer_id, status, buyer_confirmed_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    redirect("/orders?error=transition");
  }

  const devBypass =
    process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true";
  if (!devBypass && order.seller_id !== userId) {
    redirect(`/orders/${orderId}?error=unauthorized`);
  }

  if (order.status === "completed") {
    redirect(`/orders/${orderId}?handover_verified=1`);
  }

  if (order.status !== "ready_for_pickup") {
    redirect(`/orders/${orderId}?error=transition`);
  }

  if (!verifyHandoverPin(orderId, pin)) {
    redirect(`/orders/${orderId}?error=incorrect_pin`);
  }

  // Buyer sharing their 4-digit handover PIN constitutes buyer delivery confirmation.
  // Record buyer_confirmed_at via service_role if missing so Postgres transition_order_status('completed')
  // sets seller_confirmed_at and completes both sides cleanly in one atomic transition.
  const adminDb = createStorageAdminClient();
  const now = new Date().toISOString();
  if (adminDb && !order.buyer_confirmed_at) {
    await adminDb
      .from("orders")
      .update({ buyer_confirmed_at: now, updated_at: now })
      .eq("id", orderId)
      .is("buyer_confirmed_at", null);
  }

  const { error: rpcError } = await supabase.rpc("transition_order_status", {
    p_order_id: orderId,
    p_next_status: "completed",
  });

  if (rpcError && !devBypass) {
    console.warn("Handover RPC error:", rpcError.message);
    redirect(`/orders/${orderId}?error=transition`);
  }

  const verifierClient = adminDb ?? supabase;
  const { data: finalOrder } = await verifierClient
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (finalOrder?.status !== "completed" && !devBypass) {
    redirect(`/orders/${orderId}?error=transition`);
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  redirect(`/orders/${orderId}?handover_verified=1`);
}

export async function confirmBuyerHandover(formData: FormData) {
  const rawOrderId = formData.get("order_id");
  const safePrefix = getSafeOrderRedirectPrefix(rawOrderId);
  const parsed = z.object({ orderId: z.string().uuid() }).safeParse({ orderId: rawOrderId });
  if (!parsed.success) {
    redirect(`${safePrefix}?error=transition`);
  }

  const { orderId } = parsed.data;
  const { supabase, userId } = await requireApprovedMember();
  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== userId) {
    redirect(order ? `/orders/${orderId}?error=unauthorized` : "/orders?error=transition");
  }

  if (order.status === "completed") {
    redirect(`/orders/${orderId}?handover_verified=1`);
  }

  if (order.status !== "ready_for_pickup") {
    redirect(`/orders/${orderId}?error=transition`);
  }

  const { error } = await supabase.rpc("transition_order_status", {
    p_order_id: orderId,
    p_next_status: "completed",
  });

  if (error) {
    redirect(`/orders/${orderId}?error=transition`);
  }

  const { data: updated } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  redirect(
    updated?.status === "completed"
      ? `/orders/${orderId}?handover_verified=1`
      : `/orders/${orderId}?buyer_confirmed=1`
  );
}

export async function updateOrderStatus(formData: FormData) {
  const rawOrderId = formData.get("order_id");
  const safePrefix = getSafeOrderRedirectPrefix(rawOrderId);
  const parsed = z.object({
    orderId: z.string().uuid(),
    nextStatus: z.enum(["accepted", "rejected", "payment_pending", "ready_for_pickup", "completed", "cancelled"]),
  }).safeParse({ orderId: rawOrderId, nextStatus: formData.get("next_status") });
  if (!parsed.success) redirect(`${safePrefix}?error=transition`);

  const { supabase } = await requireApprovedMember();
  const { error } = await supabase.rpc("transition_order_status", {
    p_order_id: parsed.data.orderId,
    p_next_status: parsed.data.nextStatus,
  });

  if (!error && (parsed.data.nextStatus === "cancelled" || parsed.data.nextStatus === "rejected")) {
    await syncOrderProductsInFirestore(parsed.data.orderId);
    revalidatePath("/marketplace");
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  redirect(error ? `/orders/${parsed.data.orderId}?error=transition` : `/orders/${parsed.data.orderId}?updated=1`);
}

export async function submitPaymentReference(formData: FormData) {
  const rawOrderId = formData.get("order_id");
  const safePrefix = getSafeOrderRedirectPrefix(rawOrderId);
  const parsed = z.object({
    orderId: z.string().uuid(),
    reference: z.string().trim().min(6).max(50).regex(/^[a-zA-Z0-9-]+$/),
  }).safeParse({
    orderId: rawOrderId,
    reference: formData.get("payment_reference"),
  });
  if (!parsed.success) redirect(`${safePrefix}?error=payment_reference`);

  const { supabase, userId } = await requireApprovedMember();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, buyer_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== userId) {
    redirect(`/orders/${parsed.data.orderId}?error=unauthorized`);
  }

  if (order.status === "accepted") {
    const { error: pendingErr } = await supabase.rpc("transition_order_status", {
      p_order_id: parsed.data.orderId,
      p_next_status: "payment_pending",
    });
    if (pendingErr) {
      redirect(`/orders/${parsed.data.orderId}?error=payment`);
    }
  }

  const { error } = await supabase.rpc("submit_manual_payment_reference", {
    p_order_id: parsed.data.orderId,
    p_reference: parsed.data.reference,
  });
  if (error?.code === "P0001" && error.message.includes("rate_limit_exceeded")) {
    redirect(`/orders/${parsed.data.orderId}?error=rate_limit`);
  }
  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  redirect(error ? `/orders/${parsed.data.orderId}?error=payment` : `/orders/${parsed.data.orderId}?reference_submitted=1`);
}

export async function submitOrderReview(formData: FormData) {
  const rawOrderId = formData.get("order_id");
  const safePrefix = getSafeOrderRedirectPrefix(rawOrderId);
  const parsed = z.object({
    orderId: z.string().uuid(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1200),
  }).safeParse({ orderId: rawOrderId, rating: formData.get("rating"), comment: formData.get("comment") ?? "" });
  if (!parsed.success) redirect(`${safePrefix}?error=review`);

  const { supabase, userId } = await requireApprovedMember();
  const { data: order } = await supabase
    .from("orders")
    .select("id, buyer_id, seller_id, status")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order || order.status !== "completed" || ![order.buyer_id, order.seller_id].includes(userId)) {
    redirect(`/orders/${parsed.data.orderId}?error=review`);
  }

  const reviewedUserId = order.buyer_id === userId ? order.seller_id : order.buyer_id;
  const { error } = await supabase.from("reviews").insert({
    order_id: order.id,
    reviewer_id: userId,
    reviewed_user_id: reviewedUserId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  });
  if (error) redirect(`/orders/${parsed.data.orderId}?error=review`);

  const { data: reviewedProfile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", reviewedUserId)
    .maybeSingle();

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/dashboard");
  if (reviewedProfile?.handle) {
    revalidatePath(`/members/${reviewedProfile.handle}`);
  }
  redirect(`/orders/${parsed.data.orderId}?reviewed=1`);
}
