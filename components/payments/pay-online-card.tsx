"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Landmark, Loader2, QrCode, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { completeOrderPayment } from "@/app/orders/payment-actions";
import { calculateCommission } from "@/lib/payments/commission";

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayErrorResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface RazorpayOptions {
  key?: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: RazorpayErrorResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type PayOnlineCardProps = {
  orderId: string;
  amount: number;
  currency?: string;
  buyerName?: string;
};

export function PayOnlineCard({ orderId, amount, buyerName = "Campus Member" }: PayOnlineCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sandboxPaymentId, setSandboxPaymentId] = useState("");
  const [sandboxOrderRef, setSandboxOrderRef] = useState("");

  const breakdown = calculateCommission(amount, 5);

  const openSandbox = (method: "upi" | "card" | "netbanking" = selectedMethod) => {
    setSandboxPaymentId(`PAY-${method.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`);
    setSandboxOrderRef(`REF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`);
    setShowSandboxModal(true);
  };

  const handleMethodSelect = (method: "upi" | "card" | "netbanking") => {
    setSelectedMethod(method);
    setSandboxPaymentId(`PAY-${method.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`);
  };

  async function handleStartPayment() {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Ensure Razorpay checkout script is loaded
      if (typeof window !== "undefined" && !window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay checkout SDK"));
          document.body.appendChild(script);
        });
      }

      // 2. Call Backend Create Order Endpoint
      const createRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(breakdown.totalAmount * 100),
          currency: "INR",
          receipt: `ord_${orderId.slice(0, 16)}`,
          notes: {
            loopec_order_id: orderId,
            platform: "LOOPEC",
          },
        }),
      });

      const orderData = await createRes.json();

      // If backend create-order fails or returns error, open campus sandbox modal
      if (!createRes.ok || !orderData.order_id) {
        console.warn("Live Razorpay order creation returned:", orderData.error);
        openSandbox();
        setLoading(false);
        return;
      }

      // 3. Open Razorpay Standard Checkout Modal
      const options: RazorpayOptions = {
        key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "LOOPEC",
        description: `Campus Order ${orderId.slice(0, 8)}`,
        image: "/logo.png",
        order_id: orderData.order_id,
        prefill: {
          name: buyerName,
        },
        theme: {
          color: "#49347F",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        handler: async function (response: RazorpaySuccessResponse) {
          try {
            // 4. Send all three to verify endpoint
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                loopec_order_id: orderId,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment signature verification failed");
            }

            router.push(`/orders/${orderId}?paid=1`);
            router.refresh();
          } catch (verifyErr: unknown) {
            const msg = verifyErr instanceof Error ? verifyErr.message : "Payment verification failed";
            setErrorMessage(msg);
            setLoading(false);
          }
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout failed to initialize");
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: RazorpayErrorResponse) {
        setErrorMessage(response.error?.description || "Payment failed or was cancelled.");
        setLoading(false);
      });

      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while initiating payment.";
      setErrorMessage(msg);
      setLoading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#d0c1ab]/50 bg-white/95 p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[#241e14] text-[#eee9e2] shadow-xs">
            <Zap size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#241e14]">Pay Online · Instant Escrow</h2>
            <p className="text-xs text-[#736b60]">
              UPI, Cards, Netbanking via Razorpay · 0% buyer processing fee
            </p>
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

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <p className="font-semibold">Payment Notice</p>
          <p className="mt-0.5">{errorMessage}</p>
        </div>
      )}

      {/* Pay CTA Button */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleStartPayment}
          disabled={loading}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#241e14] px-6 text-sm font-semibold text-[#eee9e2] shadow-sm transition hover:bg-[#382f20] active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Opening Secure Payment Gateway...
            </>
          ) : (
            <>
              <Zap size={16} />
              Pay {breakdown.formatted.totalAmount} with Razorpay
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => openSandbox()}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d0c1ab] bg-white px-4 text-xs font-semibold text-[#241e14] transition hover:bg-[#eee9e2]/50"
          title="Campus Sandbox Simulation for offline test runs"
        >
          Campus Sandbox
        </button>
      </div>

      {/* Campus Sandbox Simulation Modal (For offline/sandbox fallback) */}
      {showSandboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241e14]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-[#d0c1ab] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eee9e2] pb-3">
              <div className="flex items-center gap-2 text-[#241e14]">
                <ShieldCheck size={20} className="text-[#8e7a63]" />
                <h3 className="font-serif text-lg font-bold">LOOPEC Campus Sandbox</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSandboxModal(false)}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-[#736b60]">
              Simulate standard payment gateway callback for local test orders. Select your simulated channel:
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
                  <p className="font-semibold text-[#241e14]">Simulated UPI Intent: Google Pay, PhonePe, Paytm</p>
                  <p className="text-[11px] text-[#736b60]">Direct instant authorization without external bank network latency.</p>
                </div>
              )}
              {selectedMethod === "card" && (
                <div className="space-y-1">
                  <p className="font-semibold text-[#241e14]">Simulated RuPay / Visa / Mastercard</p>
                  <p className="text-[11px] text-[#736b60]">Auto-approved 3D-Secure campus sandbox transaction.</p>
                </div>
              )}
              {selectedMethod === "netbanking" && (
                <div className="space-y-1">
                  <p className="font-semibold text-[#241e14]">Simulated Campus NetBanking</p>
                  <p className="text-[11px] text-[#736b60]">State Bank of India (SBI NITC Branch), Canara Bank, HDFC, ICICI supported.</p>
                </div>
              )}
            </div>

            <form action={completeOrderPayment} className="mt-5">
              <input type="hidden" name="order_id" value={orderId} />
              <input type="hidden" name="provider" value="sandbox" />
              <input
                type="hidden"
                name="payment_id"
                value={sandboxPaymentId || `PAY-${selectedMethod.toUpperCase()}-SANDBOX`}
              />
              <input
                type="hidden"
                name="order_reference"
                value={sandboxOrderRef || "REF-SANDBOX"}
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
  paymentMethod = "Online",
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
        <div className="mb-2.5 flex justify-between border-b border-[#eee] pb-2 text-[#686072]">
          <span>Order ID</span>
          <code className="font-mono font-semibold text-[#2f273b]">#{orderId.slice(0, 8)}</code>
        </div>
        {referenceId && (
          <div className="mb-3 flex justify-between border-b border-[#eee] pb-2 text-[#686072]">
            <span>Transaction Reference</span>
            <code className="font-mono font-semibold text-[#2f273b]">{referenceId}</code>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[#686072]">
            <span>Gross Amount</span>
            <b className="text-[#2f273b]">{breakdown.formatted.totalAmount}</b>
          </div>
          <div className="flex justify-between text-[#686072]">
            <span>LOOPEC Platform Commission (5%)</span>
            <b className="text-violet-900">{breakdown.formatted.commissionAmount}</b>
          </div>
          <div className="flex justify-between text-[#686072]">
            <span>Seller Net Payout (95%)</span>
            <b className="text-emerald-900">{breakdown.formatted.sellerNetAmount}</b>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-emerald-900">
        The payment is held in escrow. Payout to seller will be disbursed once both participants confirm the campus pickup handover.
      </p>
    </article>
  );
}
