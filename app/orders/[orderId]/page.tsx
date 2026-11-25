import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { FormNotice } from "@/components/auth/auth-shell";
import { authMessage } from "@/lib/auth/messages";
import { requireApprovedMember } from "@/lib/auth/member";
import { submitOrderReview, submitPaymentReference, updateOrderStatus } from "@/app/orders/actions";
import { PaymentReceiptCard } from "@/components/payments/pay-online-card";
import { WhatsAppPayCard } from "@/components/payments/whatsapp-pay-card";
import { CampusHandoverCard } from "@/components/orders/campus-handover-card";
import { getOrderHandoverPin } from "@/lib/orders/handover";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

type Order = {
  id: string;
  buyer_id: string;
  seller_id: string;
  college_id: string;
  pickup_location_id: string | null;
  status: string;
  subtotal: number | string;
  commission_amount: number | string;
  total_amount: number | string;
  currency: string;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  created_at: string;
};
type OrderItem = { id: string; product_name: string; unit_price: number | string; quantity: number; line_total: number | string };
type Payment = { id: string; method: string; provider?: string; status: string; amount: number | string; provider_payment_id: string | null; review_note: string | null; verified_at: string | null };
const statusLabels: Record<string, string> = {
  pending: "Waiting for seller",
  accepted: "Accepted",
  rejected: "Declined",
  payment_pending: "Payment pending",
  paid: "Paid & Secured",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function OrderDetailsPage({ params, searchParams }: PageProps<"/orders/[orderId]">) {
  const [{ orderId }, paramsData] = await Promise.all([params, searchParams]);
  const errorCode = Array.isArray(paramsData.error) ? paramsData.error[0] : paramsData.error;
  const { supabase, userId, profile } = await requireApprovedMember();
  const { data: orderData } = await supabase.from("orders").select("id, buyer_id, seller_id, college_id, pickup_location_id, status, subtotal, commission_amount, total_amount, currency, buyer_confirmed_at, seller_confirmed_at, created_at").eq("id", orderId).maybeSingle();
  if (!orderData) notFound();
  const order = orderData as Order;
  const buyerView = order.buyer_id === userId;
  if (!buyerView && order.seller_id !== userId && process.env.LOOPEC_DEV_BYPASS_AUTH !== "true") notFound();
  const otherId = buyerView ? order.seller_id : order.buyer_id;
  const [{ data: itemData }, { data: paymentData }, personResult, { data: pickupData }, { data: conversationData }, { data: reviewData }] = await Promise.all([
    supabase.from("order_items").select("id, product_name, unit_price, quantity, line_total").eq("order_id", order.id),
    supabase.from("payments").select("id, method, provider, status, amount, provider_payment_id, review_note, verified_at").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("profiles").select("id, full_name, handle, phone, upi_id").eq("id", otherId).maybeSingle(),
    order.pickup_location_id ? supabase.from("pickup_locations").select("id, name, address, instructions").eq("id", order.pickup_location_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("conversations").select("id").eq("order_id", order.id).maybeSingle(),
    supabase.from("reviews").select("id, rating, comment").eq("order_id", order.id).eq("reviewer_id", userId).maybeSingle(),
  ]);
  let personData = personResult.data as { id: string; full_name: string; handle: string; phone?: string | null; upi_id?: string | null } | null;
  if (personResult.error && (personResult.error.code === "42703" || personResult.error.message?.includes("upi_id"))) {
    const fallbackPerson = await supabase.from("profiles").select("id, full_name, handle, phone").eq("id", otherId).maybeSingle();
    personData = fallbackPerson.data ? { ...fallbackPerson.data, upi_id: null } : null;
  }
  const items = (itemData ?? []) as OrderItem[];
  const payment = paymentData as Payment | null;
  const person = personData as { id: string; full_name: string; handle: string; phone?: string | null; upi_id?: string | null } | null;
  const pickup = pickupData as { id: string; name: string; address: string; instructions: string } | null;
  const conversation = conversationData as { id: string } | null;
  const review = reviewData as { id: string; rating: number; comment: string } | null;
  const errorMessage = errorCode ? authMessage(errorCode) : null;
  const title = statusLabels[order.status] ?? order.status;
  const isPaid = order.status === "paid" || ["ready_for_pickup", "completed"].includes(order.status) || payment?.status === "paid";
  const totalAmount = Math.max(0, Number(order.total_amount) || 0);
  const commissionAmount = Math.max(0, Number(order.commission_amount) || 0);
  const sellerNetAmount = Math.max(0, totalAmount - commissionAmount);

  return (
    <main className="min-h-screen bg-transparent">
      {/* Global Responsive Site Header */}
      <SiteHeader
        profile={profile}
        sectionTitle="Order Details"
      />
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/orders" className="inline-flex items-center gap-2 rounded-full border border-[#d0c1ab]/50 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#5f574d] hover:bg-white hover:text-[#241e14] shadow-xs transition">
          <ArrowLeft size={14} /> Orders
        </Link>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">{buyerView ? "Buyer order" : "Seller order"}</p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#241e14]">{title}</h1>
            <p className="mt-1.5 text-xs text-[#736b60]">Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isPaid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : ["rejected", "cancelled", "refunded"].includes(order.status) ? "bg-[#eee9e2] text-[#736b60] border border-[#d0c1ab]" : "bg-[#eee9e2] text-[#241e14] border border-[#d0c1ab]"}`}>
            {title}
          </span>
        </div>
        <div className="mt-6 space-y-4">
          {errorMessage ? <FormNotice>{errorMessage}</FormNotice> : null}
          {paramsData.paid ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">⚡ Payment verified successfully! Your order is secured in campus escrow.</p> : null}
          {paramsData.handover_verified ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">🎉 Campus handover verified successfully! The order is now completed and payout is released.</p> : null}
          {paramsData.updated ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Order status updated.</p> : null}
          {paramsData.reference_submitted ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Payment reference submitted for verification.</p> : null}

          {/* WhatsApp Direct Contact & UPI Pay Card (When accepted / awaiting payment) */}
          {buyerView && ["accepted", "payment_pending"].includes(order.status) && !isPaid ? (
            <WhatsAppPayCard
              orderId={order.id}
              amount={Number(order.total_amount)}
              currency={order.currency}
              itemNames={items.map((i) => i.product_name)}
              buyerName={profile.full_name}
              sellerName={person?.full_name || "Campus Seller"}
              sellerPhone={person?.phone}
              sellerUpiId={person?.upi_id}
              pickupLocationName={pickup?.name}
              conversationId={conversation?.id}
            />
          ) : null}

          {/* Paid Receipt Card */}
          {isPaid ? (
            <PaymentReceiptCard
              orderId={order.id}
              amount={Number(order.total_amount)}
              paymentMethod={
                payment?.provider === "whatsapp_upi"
                  ? "WhatsApp Direct Pay"
                  : payment?.provider === "direct_upi"
                  ? "Direct UPI App"
                  : payment?.provider === "cash_pickup"
                  ? "Cash Handover"
                  : payment?.provider === "manual_upi"
                  ? "Manual UPI Ref"
                  : "Direct Campus Pay"
              }
              referenceId={payment?.provider_payment_id}
              verifiedAt={payment?.verified_at}
            />
          ) : null}

          {/* Order Items & 5% Platform Fee Transparency */}
          <article className="rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 shadow-xs sm:p-6">
            <h2 className="text-sm font-bold text-[#241e14]">Order items</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div className="flex items-center gap-3 border-t border-[#eee9e2] pt-3 first:border-0 first:pt-0" key={item.id}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eee9e2] text-[#241e14]">{buyerView ? "↗" : "↙"}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-[#241e14]">{item.product_name}</b>
                    <small className="mt-0.5 block text-xs text-[#736b60]">{currency.format(Number(item.unit_price))} × {item.quantity}</small>
                  </span>
                  <b className="text-sm font-semibold text-[#241e14]">{currency.format(Number(item.line_total))}</b>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-[#eee9e2] pt-4 space-y-2 text-xs text-[#736b60]">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <b className="text-[#241e14]">{currency.format(Number(order.subtotal || totalAmount))}</b>
              </div>
              <div className="flex justify-between">
                <span>LOOPEC Platform Fee</span>
                <b className="text-[#8e7a63] font-semibold">{currency.format(commissionAmount)}</b>
              </div>
              <div className="flex justify-between">
                <span>Seller Net Proceeds</span>
                <b className="text-[#241e14] font-semibold">{currency.format(sellerNetAmount)}</b>
              </div>
              <div className="border-t border-[#eee9e2] pt-2 flex justify-between text-sm">
                <span className="font-bold text-[#241e14]">Total Amount</span>
                <b className="font-bold text-[#241e14]">{currency.format(totalAmount)}</b>
              </div>
            </div>
          </article>

          {/* Campus Pickup Location */}
          {pickup ? (
            <article className="rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 shadow-xs sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#241e14]"><MapPin size={16} className="text-[#8e7a63]" /> Campus pickup</h2>
              <p className="mt-3 text-sm font-semibold text-[#241e14]">{pickup.name}</p>
              <p className="mt-1 text-sm text-[#736b60]">{pickup.address}</p>
              {pickup.instructions ? <p className="mt-2 text-xs leading-5 text-[#736b60]">{pickup.instructions}</p> : null}
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#eee9e2]/60 border border-[#d0c1ab]/40 px-4 py-3 text-xs leading-5 text-[#241e14]">
                <Clock3 size={15} className="shrink-0 text-[#8e7a63]" /> Coordinate an exact meeting time with {person?.full_name ?? (buyerView ? "the seller" : "the buyer")} in Messages.
              </div>
            </article>
          ) : null}

          {/* Optional Manual UPI Transfer (Expandable) */}
          {!isPaid && (
            <details className="rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 text-xs text-[#736b60] shadow-xs">
              <summary className="cursor-pointer font-bold text-[#241e14] hover:text-[#8e7a63]">
                Prefer manual UPI bank transfer reference?
              </summary>
              <div className="mt-3 space-y-3 border-t border-[#eee9e2] pt-3">
                <p>If you transferred funds directly to the seller via your bank app, enter the transaction reference number below for admin verification.</p>
                {buyerView && ["accepted", "payment_pending"].includes(order.status) ? (
                  <form action={submitPaymentReference} className="mt-3 space-y-3">
                    <input type="hidden" name="order_id" value={order.id} />
                    <label className="block text-xs font-semibold text-[#5f574d]">
                      UPI transaction reference
                      <input className="mt-2 min-h-12 w-full rounded-xl border border-[#d0c1ab] bg-white px-3.5 text-sm outline-none focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-xs" name="payment_reference" inputMode="text" autoComplete="off" pattern="[A-Za-z0-9-]{6,50}" minLength={6} maxLength={50} required placeholder="Reference from your UPI app" />
                    </label>
                    <button className="min-h-11 rounded-full bg-[#241e14] px-5 text-sm font-semibold text-[#eee9e2] hover:bg-[#382f20] shadow-sm" type="submit">Submit reference for review</button>
                  </form>
                ) : null}
              </div>
            </details>
          )}

          {/* Message Link */}
          {conversation ? (
            <Link className="flex items-center justify-between rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 shadow-xs transition hover:border-[#8e7a63]" href={`/messages/${conversation.id}`}>
              <span className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eee9e2] text-[#241e14]"><MessageCircle size={18} /></span>
                <span>
                  <b className="block text-sm text-[#241e14]">Message {person?.full_name ?? "member"}</b>
                  <small className="mt-0.5 block text-xs text-[#736b60]">Private coordination for this order</small>
                </span>
              </span>
              <span className="text-xs font-semibold text-[#241e14] underline underline-offset-4 hover:text-[#8e7a63]">Open messages</span>
            </Link>
          ) : null}

          {/* Campus Delivery PIN & QR Handover Card */}
          {["ready_for_pickup", "completed"].includes(order.status) ? (
            <CampusHandoverCard
              orderId={order.id}
              buyerView={buyerView}
              status={order.status}
              handoverPin={getOrderHandoverPin(order.id)}
              buyerConfirmedAt={order.buyer_confirmed_at}
              sellerConfirmedAt={order.seller_confirmed_at}
              sellerName={buyerView ? person?.full_name : profile.full_name}
              buyerName={buyerView ? profile.full_name : person?.full_name}
              pickupLocationName={pickup?.name ?? "Designated Campus Pickup Zone"}
            />
          ) : null}

          {/* Initial Pending Actions */}
          {order.status === "pending" ? (
            <article className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 shadow-xs">
              <div>
                <p className="text-sm font-bold text-[#241e14]">{buyerView ? "Waiting for seller response" : `Order from ${person?.full_name ?? "a member"}`}</p>
                <p className="mt-1 text-xs text-[#736b60]">{buyerView ? "The seller will accept or decline this request." : "Review the items and then accept or decline the order."}</p>
              </div>
              <div className="flex gap-2">
                {!buyerView ? (
                  <>
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="next_status" value="accepted" />
                      <button className="min-h-10 rounded-full bg-[#241e14] px-4 text-xs font-semibold text-[#eee9e2] hover:bg-[#382f20] shadow-sm" type="submit">Accept</button>
                    </form>
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="next_status" value="rejected" />
                      <button className="min-h-10 rounded-full border border-rose-200 px-4 text-xs font-semibold text-rose-800 hover:bg-rose-50" type="submit">Decline</button>
                    </form>
                  </>
                ) : null}
                {buyerView ? (
                  <form action={updateOrderStatus}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <input type="hidden" name="next_status" value="cancelled" />
                    <button className="min-h-10 rounded-full border border-[#d0c1ab] px-4 text-xs font-semibold text-[#5f574d] hover:bg-[#eee9e2]/50" type="submit">Cancel request</button>
                  </form>
                ) : null}
              </div>
            </article>
          ) : null}

          {/* Seller Paid Action: Mark Ready for Pickup */}
          {order.status === "paid" && !buyerView ? (
            <article className="rounded-[24px] border border-emerald-300 bg-emerald-50/80 p-5 shadow-xs">
              <p className="text-sm font-semibold text-emerald-950">Payment verified & escrowed</p>
              <p className="mt-2 text-xs leading-5 text-emerald-900">Your net payout ({currency.format(sellerNetAmount)}) is recorded. Prepare the item and arrange pickup.</p>
              <form action={updateOrderStatus} className="mt-4">
                <input type="hidden" name="order_id" value={order.id} />
                <input type="hidden" name="next_status" value="ready_for_pickup" />
                <button className="min-h-11 rounded-full bg-[#241e14] px-5 text-sm font-semibold text-[#eee9e2] hover:bg-[#382f20] shadow-sm" type="submit">Mark ready for campus pickup</button>
              </form>
            </article>
          ) : null}

          {/* Completed Rating */}
          {order.status === "completed" ? (
            <article className="rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 p-5 shadow-xs sm:p-6">
              <h2 className="text-sm font-bold text-[#241e14]">Rate this campus exchange</h2>
              {review ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-[#241e14]">{review.rating} out of 5</p>
                  {review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#736b60]">{review.comment}</p> : null}
                </div>
              ) : (
                <form action={submitOrderReview} className="mt-4 space-y-3">
                  <input type="hidden" name="order_id" value={order.id} />
                  <label className="block text-xs font-semibold text-[#5f574d]">
                    Your rating
                    <select className="mt-2 min-h-11 w-full rounded-xl border border-[#d0c1ab] bg-white px-3.5 text-sm outline-none focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-xs" name="rating" defaultValue="5">
                      <option value="5">5 · Excellent</option>
                      <option value="4">4 · Good</option>
                      <option value="3">3 · Okay</option>
                      <option value="2">2 · Needs work</option>
                      <option value="1">1 · Poor</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#5f574d]">
                    Comment <span className="font-normal">(optional)</span>
                    <textarea className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#d0c1ab] bg-white p-3 text-sm outline-none focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-xs" name="comment" maxLength={1200} />
                  </label>
                  <button className="min-h-10 rounded-full bg-[#241e14] px-4 text-sm font-semibold text-[#eee9e2] hover:bg-[#382f20] shadow-sm" type="submit">Submit review</button>
                </form>
              )}
            </article>
          ) : null}
        </div>
      </section>
    </main>
  );
}
