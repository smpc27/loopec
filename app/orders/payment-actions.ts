"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth/member";
import {
  confirmOrderPaymentInDb,
  type PaymentSessionResult,
} from "@/lib/payments/service";

// Re-export so callers that import PaymentSessionResult still work
export type { PaymentSessionResult };

const paymentPayloadSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(["sandbox", "manual_upi", "whatsapp_upi", "direct_upi", "cash_pickup"]),
  paymentId: z.string().min(3).max(100),
  orderReference: z.string().max(100).optional(),
});

/**
 * Verifies and completes the payment (campus sandbox or direct UPI).
 */
export async function completeOrderPayment(formData: FormData) {
  const rawOrderId = formData.get("order_id");
  const parsed = paymentPayloadSchema.safeParse({
    orderId: rawOrderId,
    provider: formData.get("provider"),
    paymentId: formData.get("payment_id"),
    orderReference: formData.get("order_reference") || undefined,
  });

  if (!parsed.success) {
    const validOrderId = z.string().uuid().safeParse(rawOrderId);
    if (validOrderId.success) {
      redirect(`/orders/${validOrderId.data}?error=payment_payload`);
    }
    redirect("/orders?error=payment_payload");
  }

  const { orderId, provider, paymentId, orderReference } = parsed.data;
  const { supabase, userId } = await requireApprovedMember();

  // Validate the caller is the buyer
  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id")
    .eq("id", orderId)
    .maybeSingle();

  const isDevBypass =
    process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true";

  if (!order || (order.buyer_id !== userId && !isDevBypass)) {
    redirect(order ? `/orders/${orderId}?error=unauthorized` : "/orders?error=unauthorized");
  }

  const result = await confirmOrderPaymentInDb(supabase, {
    orderId,
    provider,
    paymentId,
    orderReference,
  });

  if (!result.success) {
    redirect(`/orders/${orderId}?error=payment_confirm_failed`);
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  redirect(`/orders/${orderId}?paid=1`);
}
