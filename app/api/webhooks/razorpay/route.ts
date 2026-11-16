import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmOrderPaymentInDb } from "@/lib/payments/service";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (
        !crypto.timingSafeEqual(
          Buffer.from(expectedSignature, "utf-8"),
          Buffer.from(signature, "utf-8")
        )
      ) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload?.event;

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = payload?.payload?.payment?.entity;
      const orderId =
        paymentEntity?.notes?.loopec_order_id ||
        payload?.payload?.order?.entity?.notes?.loopec_order_id;
      const paymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;

      if (orderId && paymentId) {
        const supabase = await createClient();
        await confirmOrderPaymentInDb(supabase, {
          orderId,
          provider: "razorpay",
          paymentId,
          orderReference: razorpayOrderId,
        });
      }
    }

    return NextResponse.json({ status: "ok", received: true });
  } catch (err: unknown) {
    console.error("Razorpay webhook error:", err);
    const errObj = err as { message?: string } | null;
    return NextResponse.json({ error: errObj?.message || "Webhook processing error" }, { status: 500 });
  }
}
