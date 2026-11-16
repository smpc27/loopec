"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Wallet,
  Banknote,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { completeOrderPayment } from "@/app/orders/payment-actions";
import { inrFormatter } from "@/lib/payments/commission";

type WhatsAppPayCardProps = {
  orderId: string;
  amount: number;
  currency?: string;
  itemNames?: string[];
  buyerName?: string;
  sellerName?: string;
  sellerPhone?: string | null;
  sellerUpiId?: string | null;
  pickupLocationName?: string | null;
  conversationId?: string | null;
};

export function WhatsAppPayCard({
  orderId,
  amount,
  itemNames = ["Campus item"],
  buyerName = "Buyer",
  sellerName = "Seller",
  sellerPhone,
  sellerUpiId,
  pickupLocationName = "Designated Campus Pickup Point",
  conversationId,
}: WhatsAppPayCardProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"whatsapp" | "direct_upi" | "cash">("whatsapp");

  // Format phone number for WhatsApp wa.me link
  const rawDigits = (sellerPhone || "").replace(/\D/g, "");
  const formattedWaNumber = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;

  const itemsListText =
    itemNames.slice(0, 2).join(", ") + (itemNames.length > 2 ? ` (+${itemNames.length - 2} more)` : "");

  // Prefilled WhatsApp message
  const waMessage = encodeURIComponent(
    `Hi ${sellerName}! 👋 I placed an order on LOOPEC for "${itemsListText}" (Order #${orderId.slice(0, 8)}).\n\n` +
      `💰 Amount to Pay: ₹${amount.toLocaleString("en-IN")}\n` +
      `📍 Meeting Point: ${pickupLocationName}\n` +
      `👤 Buyer: ${buyerName}\n\n` +
      `Please share your UPI ID or QR code here on WhatsApp so I can pay you directly!`
  );

  const waLink = formattedWaNumber ? `https://wa.me/${formattedWaNumber}?text=${waMessage}` : null;

  // Direct UPI Intent link (opens GPay / PhonePe / Paytm / BHIM)
  const upiLink = sellerUpiId
    ? `upi://pay?pa=${encodeURIComponent(sellerUpiId)}&pn=${encodeURIComponent(
        sellerName
      )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`LOOPEC Order ${orderId.slice(0, 8)}`)}`
    : null;

  const handleCopyUpi = () => {
    if (!sellerUpiId) return;
    navigator.clipboard.writeText(sellerUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyPhone = () => {
    if (!sellerPhone) return;
    navigator.clipboard.writeText(sellerPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <article className="overflow-hidden rounded-[26px] border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100/80 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#25D366] text-white shadow-sm">
            <MessageCircle size={24} />
          </span>
          <div>
            <h2 className="font-serif text-lg font-bold text-[#1a3826] sm:text-xl">
              Pay Seller Directly on WhatsApp / UPI
            </h2>
            <p className="text-xs text-[#4b6b55]">
              0% payment gateway commission · Deal directly with {sellerName}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-200">
          <ShieldCheck size={14} className="text-emerald-700" />
          Direct Student Handover
        </span>
      </div>

      {/* Amount Display */}
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#546b5c]">Order Total to Pay:</span>
          <b className="font-serif text-2xl font-extrabold text-[#1a3826]">
            {inrFormatter.format(amount)}
          </b>
        </div>
        <p className="mt-1 text-[11px] text-[#718778]">
          Meeting Location: <strong className="text-emerald-950">{pickupLocationName}</strong>
        </p>
      </div>

      {/* Primary Action: WhatsApp Connect */}
      <div className="mt-5 space-y-3">
        {waLink ? (
          <div className="space-y-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-13 w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 text-sm font-bold text-white shadow-md transition hover:bg-[#20ba59] active:scale-[0.98]"
            >
              <MessageCircle size={20} />
              <span>Chat & Pay on WhatsApp ({sellerPhone})</span>
              <ExternalLink size={15} />
            </a>

            {sellerPhone && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-900/80 hover:text-emerald-950 underline"
                >
                  {copiedPhone ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedPhone ? "Phone copied" : "Copy phone number"}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950">
            <p className="font-bold">WhatsApp number not in seller profile yet.</p>
            <p className="mt-0.5 text-[11px]">
              You can message {sellerName} directly through the in-app chat:
            </p>
            {conversationId && (
              <a
                href={`/messages/${conversationId}`}
                className="mt-2 inline-flex items-center gap-1.5 font-bold text-violet-900 underline"
              >
                Open LOOPEC Messages <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}

        {/* Direct UPI Pay Link (If Seller provided UPI) */}
        {sellerUpiId && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800">
                  Seller&apos;s UPI ID
                </span>
                <p className="font-mono text-sm font-bold text-violet-950">{sellerUpiId}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-900 shadow-xs hover:bg-violet-50 transition"
                >
                  {copiedUpi ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
                </button>

                {upiLink && (
                  <a
                    href={upiLink}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-950 px-3.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-violet-900 transition"
                  >
                    <Wallet size={13} />
                    <span>Pay with GPay / PhonePe</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alternate Options Tab */}
      <div className="mt-5 border-t border-emerald-100 pt-4">
        <p className="text-xs font-bold text-[#355240]">How would you like to settle?</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSelectedMethod("whatsapp")}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition ${
              selectedMethod === "whatsapp"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <MessageCircle size={16} className="text-[#25D366]" />
            <span>WhatsApp / UPI</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod("direct_upi")}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition ${
              selectedMethod === "direct_upi"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Wallet size={16} className="text-violet-700" />
            <span>Direct UPI App</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod("cash")}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition ${
              selectedMethod === "cash"
                ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Banknote size={16} className="text-emerald-700" />
            <span>Cash on Pickup</span>
          </button>
        </div>
      </div>

      {/* Confirmation Form (Once paid or agreed) */}
      <form action={completeOrderPayment} className="mt-5 space-y-3">
        <input type="hidden" name="order_id" value={orderId} />
        <input
          type="hidden"
          name="provider"
          value={
            selectedMethod === "cash"
              ? "cash_pickup"
              : selectedMethod === "direct_upi"
              ? "direct_upi"
              : "whatsapp_upi"
          }
        />
        <input
          type="hidden"
          name="payment_id"
          value={`WA-${selectedMethod.toUpperCase()}-${orderId.slice(0, 8).toUpperCase()}`}
        />

        <div className="rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-950 border border-emerald-100">
          <p className="font-semibold flex items-center gap-1">
            <CheckCircle2 size={14} className="text-emerald-700" />
            Zero Platform Fee:
          </p>
          <p className="mt-0.5 text-[11px] text-[#4b6b55]">
            100% of your payment goes directly to the student seller. Once you contact or pay {sellerName}, click below to confirm and generate your 4-digit Handover PIN!
          </p>
        </div>

        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1b3a27] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#152e1f] active:scale-[0.99]"
        >
          <CheckCircle2 size={16} />
          <span>I have contacted / paid {sellerName} · Proceed to Handover</span>
        </button>
      </form>
    </article>
  );
}
