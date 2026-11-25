"use client";

import { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Clock3,
  QrCode,
  ArrowRight,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyCampusHandover } from "@/app/orders/actions";

type CampusHandoverCardProps = {
  orderId: string;
  buyerView: boolean;
  status: string;
  handoverPin: string;
  buyerConfirmedAt: string | null;
  sellerConfirmedAt: string | null;
  sellerName?: string;
  buyerName?: string;
  pickupLocationName?: string;
};

export function CampusHandoverCard({
  orderId,
  buyerView,
  status,
  handoverPin,
  buyerConfirmedAt,
  sellerConfirmedAt,
  sellerName = "Seller",
  buyerName = "Buyer",
  pickupLocationName = "Designated Campus Pickup Zone",
}: CampusHandoverCardProps) {
  const [pinInput, setPinInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const isCompleted = status === "completed";
  const isReady = status === "ready_for_pickup";

  const handleCopyPin = () => {
    navigator.clipboard.writeText(handoverPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isCompleted) {
    return (
      <article className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Handover Verified
            </span>
            <h2 className="font-serif text-xl font-bold text-emerald-950 sm:text-2xl">
              Campus Handover Completed
            </h2>
            <p className="text-xs leading-relaxed text-emerald-900/80 sm:text-sm">
              Both parties completed physical verification on campus. This order is now finalized.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-emerald-200/60 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            Verified Handover at {pickupLocationName}
          </span>
          <div className="flex items-center gap-3">
            {(buyerConfirmedAt || sellerConfirmedAt) && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-800">
                <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
                {new Date(buyerConfirmedAt || sellerConfirmedAt || "").toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
            <span className="font-mono text-emerald-800">
              Order ID: {orderId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </article>
    );
  }

  if (!isReady) {
    return null;
  }

  return (
    <article className="rounded-[26px] border border-[#d0c1ab]/60 bg-white/95 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-[#eee9e2] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#241e14] text-[#eee9e2] shadow-sm">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-[#241e14] sm:text-xl">
              Campus Delivery Handover PIN
            </h2>
            <p className="text-xs text-[#736b60]">
              Meeting point: <strong className="text-[#241e14]">{pickupLocationName}</strong>
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#eee9e2] px-3 py-1 text-xs font-semibold text-[#241e14] border border-[#d0c1ab]/60">
          <ShieldCheck className="h-3.5 w-3.5 text-[#8e7a63]" />
          Verified Handover
        </span>
      </div>

      <div className="mt-6">
        {buyerView ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#d0c1ab]/60 bg-[#eee9e2]/50 p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8e7a63]">
                Your 4-Digit Handover PIN
              </p>

              <div className="mt-3 flex items-center justify-center gap-3">
                {handoverPin.split("").map((digit, i) => (
                  <div
                    key={i}
                    className="flex h-14 w-12 sm:h-16 sm:w-14 items-center justify-center rounded-2xl border-2 border-[#241e14] bg-white font-mono text-3xl font-extrabold text-[#241e14] shadow-sm"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d0c1ab] bg-white px-3 py-1 text-xs font-medium text-[#241e14] shadow-xs hover:bg-[#eee9e2]/60 transition cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "PIN Copied!" : "Copy PIN"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d0c1ab] bg-white px-3 py-1 text-xs font-medium text-[#241e14] shadow-xs hover:bg-[#eee9e2]/60 transition cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{showQr ? "Hide Pass" : "Show Handover Pass"}</span>
                </button>
              </div>

              {showQr && (
                <div className="mt-4 p-4 bg-white rounded-xl border border-[#d0c1ab] inline-block shadow-sm">
                  <div className="grid place-items-center h-40 w-40 bg-[#241e14] rounded-lg text-[#eee9e2] text-center p-2 font-mono text-xs">
                    <QrCode className="h-20 w-20 text-[#eee9e2] mb-1" />
                    <span>PIN: {handoverPin}</span>
                    <span className="text-[9px] text-[#d0c1ab]">LOOPEC Handover</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 leading-relaxed space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                Important Buyer Safety Rule:
              </p>
              <p>
                Meet <strong>{sellerName}</strong> at <strong>{pickupLocationName}</strong>. Inspect the item thoroughly before giving this 4-digit PIN to the seller. Sharing the PIN confirms final handover.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#d0c1ab]/60 bg-[#eee9e2]/45 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#241e14]">
                Enter Buyer&apos;s Handover PIN
              </p>
              <p className="mt-1 text-xs text-[#736b60]">
                Ask <strong>{buyerName}</strong> for their 4-digit PIN once they have inspected and accepted the item.
              </p>

              <form action={verifyCampusHandover} className="mt-4 space-y-4">
                <input type="hidden" name="order_id" value={orderId} />

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    name="handover_pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="4-digit PIN"
                    className="h-14 w-48 rounded-2xl border-2 border-[#d0c1ab] bg-white px-4 text-center font-mono text-2xl font-bold tracking-widest text-[#241e14] outline-none focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-sm"
                    required
                  />

                  <Button
                    type="submit"
                    size="lg"
                    disabled={pinInput.length !== 4}
                    className="flex-1 font-semibold bg-[#241e14] hover:bg-[#382f20] text-[#eee9e2]"
                  >
                    <span>Verify PIN & Complete Handover</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>

            <div className="rounded-xl border border-[#d0c1ab]/40 bg-[#eee9e2]/40 p-4 text-xs text-[#5f574d] leading-relaxed">
              Once you enter the buyer&apos;s 4-digit PIN, this campus exchange is marked as completed for both members.
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
