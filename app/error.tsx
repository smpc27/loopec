"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[75vh] place-items-center px-4 py-12 text-[#241e14]">
      <div className="w-full max-w-md rounded-[28px] border border-[#d0c1ab]/60 bg-white/90 p-7 text-center shadow-sm backdrop-blur-xl">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-4 font-serif text-2xl tracking-tight text-[#241e14]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#5f574d]">
          {error.message?.includes("Body exceeded") || error.message?.includes("413")
            ? "Your uploaded images were too large. Try selecting fewer or smaller photos."
            : "We hit an unexpected issue completing that request. Try again or return to the marketplace."}
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#241e14] px-5 text-xs font-bold text-white hover:bg-[#382f20] transition cursor-pointer"
          >
            <RotateCcw size={14} /> Try again
          </button>
          <Link
            href="/marketplace"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d0c1ab] bg-white px-5 text-xs font-bold text-[#241e14] hover:bg-[#eee9e2] transition"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
