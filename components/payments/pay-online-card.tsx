"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Landmark, QrCode, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { completeOrderPayment } from "@/app/orders/payment-actions";
import { calculateCommission } from "@/lib/payments/commission";

type PayOnlineCardProps = {
  orderId: string;
  amount: number;
  currency?: string;
  buyerName?: string;
};

export function PayOnlineCard({ orderId, amount }: PayOnlineCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [sandboxPaymentId, setSandboxPaymentId] = useState("");
  const [sandboxOrderRef, setSandboxOrderRef] = useState("");

  const breakdown = calculateCommission(amount, 5);

  const openModal = (method: "upi" | "card" | "netbanking" = selectedMethod) => {
    setSandboxPaymentId(`PAY-${method.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`);
    setSandboxOrderRef(`REF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`);
    setShowModal(true);
  };

  const handleMethodSelect = (method: "upi" | "card" | "netbanking") => {
    setSelectedMethod(method);
    setSandboxPaymentId(`PAY-${method.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`);
  };

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#d0c1ab]/50 bg-white/95 p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[#241e14] text-[#eee9e2] shadow-xs">
            <Zap size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#241e14]">Pay Online · Instant Escrow</h2>
            <p className="text-xs text-[#736b60]">UPI, Cards, Netbanking · 0% buyer processing fee</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eee9e2] px-2.5 py-1 text-[11px] font-semibold text-[#241e14] border border-[#d0c1ab]/60">
          <ShieldCheck size={13} className="text-[#8e7a63]" />
          Buyer Protection Escrow
        </span>
      </div>

      {/* Commission & Escrow Breakdown */}
      <div className="mt-5 rounded-2xl border border-[#d0c1ab]/50 bg-white/90 p-4 text-xs shadow-xs">
        <div className="flex items-center justify-between font-medium text-[#241e14]">
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#8e7a63]" />
            Amount to Pay
          </span>
          <span className="text-base font-extrabold text-[#241e14]">
            {breakdown.formatted.totalAmount}
          </span>
        </div>

        <div className="mt-3 space-y-1.5 border-t border-[#eee9e2] pt-2.5 text-[11px] text-[#736b60]">
          <div className="flex justify-between">
            <span>Marketplace Subtotal:</span>
            <span>{breakdown.formatted.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>LOOPEC Platform Commission (5%):</span>
            <span className="text-[#8e7a63] font-semibold">{breakdown.formatted.commissionAmount}</span>
          </div>
          <div className="flex justify-between font-medium text-[#241e14]">
            <span>Net Seller Payout (95% held in escrow):</span>
            <span className="text-emerald-800">{breakdown.formatted.sellerNetAmount}</span>
          </div>
        </div>
      </div>

      {/* Escrow Guarantee Pill */}
      <div className="mt-3.5 flex items-start gap-2 text-xs leading-relaxed text-[#736b60]">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
        <span>
          <strong>Campus Escrow Policy:</strong> Your money is held safely. The seller only receives payout after you physically meet on campus and verify the item.
        </span>
      </div>

      {/* Pay CTA */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#241e14] px-6 text-sm font-semibold text-[#eee9e2] shadow-sm transition hover:bg-[#382f20] active:scale-[0.98]"
        >
          <Zap size={16} />
          Pay {breakdown.formatted.totalAmount}
        </button>
      </div>

      {/* Payment Method Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241e14]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-[#d0c1ab] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eee9e2] pb-3">
              <div className="flex items-center gap-2 text-[#241e14]">
                <ShieldCheck size={20} className="text-[#8e7a63]" />
                <h3 className="font-serif text-lg font-bold">Choose Payment Method</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#736b60]">
              Select how you&apos;d like to pay for this campus order:
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleMethodSelect("upi")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                  selectedMethod === "upi"
                    ? "border-[#241e14] bg-[#eee9e2] text-[#241e14] shadow-xs"
                    : "border-[#d0c1ab]/50 text-[#736b60] hover:bg-[#eee9e2]/30"
                }`}
              >
                <QrCode size={18} />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => handleMethodSelect("card")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                  selectedMethod === "card"
                    ? "border-[#241e14] bg-[#eee9e2] text-[#241e14] shadow-xs"
                    : "border-[#d0c1ab]/50 text-[#736b60] hover:bg-[#eee9e2]/30"
                }`}
              >
                <CreditCard size={18} />
                <span>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => handleMethodSelect("netbanking")}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                  selectedMethod === "netbanking"
                    ? "border-[#241e14] bg-[#eee9e2] text-[#241e14] shadow-xs"
                    : "border-[#d0c1ab]/50 text-[#736b60] hover:bg-[#eee9e2]/30"
                }`}
              >
                <Landmark size={18} />
                <span>Net Banking</span>
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#d0c1ab]/40 bg-[#eee9e2]/60 p-3 text-xs text-[#241e14]">
              {selectedMethod === "upi" && (
                <div className="space-y-1">
                  <p className="font-semibold">UPI: Google Pay, PhonePe, Paytm, BHIM</p>
                  <p className="text-[11px] text-[#736b60]">Pay seller directly via UPI and submit your transaction reference below.</p>
                </div>
              )}
              {selectedMethod === "card" && (
                <div className="space-y-1">
                  <p className="font-semibold">RuPay / Visa / Mastercard</p>
                  <p className="text-[11px] text-[#736b60]">Pay using your debit or credit card and enter the reference number.</p>
                </div>
              )}
              {selectedMethod === "netbanking" && (
                <div className="space-y-1">
                  <p className="font-semibold">Net Banking</p>
                  <p className="text-[11px] text-[#736b60]">SBI, Canara Bank, HDFC, ICICI — transfer and submit UTR reference.</p>
                </div>
              )}
            </div>

            <form action={completeOrderPayment} className="mt-5">
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="provider" value={selectedMethod === "upi" ? "direct_upi" : "sandbox"} />
              <input
                type="hidden"
                name="payment_id"
                value={sandboxPaymentId || `PAY-${selectedMethod.toUpperCase()}-INSTANT`}
              />
              <input
                type="hidden"
                name="order_reference"
                value={sandboxOrderRef || "REF-MANUAL"}
              />
              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#241e14] px-5 text-sm font-semibold text-[#eee9e2] shadow-sm transition hover:bg-[#382f20]"
              >
                <CheckCircle2 size={16} /> Confirm & Pay {breakdown.formatted.totalAmount}
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}

export function PaymentReceiptCard({
  orderId,
  amount,
  paymentMethod = "Campus Pay",
  referenceId,
  verifiedAt,
}: {
  orderId: string;
  amount: number;
  paymentMethod?: string;
  referenceId?: string | null;
  verifiedAt?: string | null;
}) {
  const breakdown = calculateCommission(amount, 5);

  return (
    <article className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-emerald-950">Payment Verified & Protected</h2>
            <p className="text-xs text-emerald-800">
              {verifiedAt ? new Date(verifiedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Verified"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-900">
            PAID · {paymentMethod}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-white/90 p-4 text-xs">
        <div className="mb-2.5 flex justify-between border-b border-[#eee9e2] pb-2 text-[#736b60]">
          <span>Order ID</span>
          <code className="font-mono font-semibold text-[#241e14]">#{orderId.slice(0, 8)}</code>
        </div>
        {referenceId && (
          <div className="mb-3 flex justify-between border-b border-[#eee9e2] pb-2 text-[#736b60]">
            <span>Transaction Reference</span>
            <code className="font-mono font-semibold text-[#241e14]">{referenceId}</code>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[#736b60]">
            <span>Gross Amount</span>
            <b className="text-[#241e14]">{breakdown.formatted.totalAmount}</b>
          </div>
          <div className="flex justify-between text-[#736b60]">
            <span>LOOPEC Platform Commission (5%)</span>
            <b className="text-[#8e7a63]">{breakdown.formatted.commissionAmount}</b>
          </div>
          <div className="flex justify-between text-[#736b60]">
            <span>Seller Net Payout (95%)</span>
            <b className="text-emerald-900">{breakdown.formatted.sellerNetAmount}</b>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-emerald-900">
        The payment is confirmed. Payout to seller is finalized once both participants confirm the campus pickup handover.
      </p>
    </article>
  );
}
