import Link from "next/link";
import { ArrowLeft, ChevronRight, GraduationCap, PackagePlus, ShieldCheck } from "lucide-react";
import { connection } from "next/server";
import { requireApprovedMember } from "@/lib/auth/member";
import { authMessage } from "@/lib/auth/messages";
import { ListingForm } from "@/components/listings/listing-form";
import { BrandMark } from "@/components/brand-mark";

export const instant = false;

type Category = { id: string; name: string };

const previewCategories: Category[] = [
  { id: "e1e1e1e1-0001-4000-8000-000000000001", name: "Books & study materials" },
  { id: "e1e1e1e1-0002-4000-8000-000000000002", name: "Electronics & Gadgets" },
  { id: "e1e1e1e1-0003-4000-8000-000000000003", name: "Stationery & Drafters" },
  { id: "e1e1e1e1-0004-4000-8000-000000000004", name: "Hostel Essentials" },
  { id: "e1e1e1e1-0005-4000-8000-000000000005", name: "Cycles & Sports" },
  { id: "e1e1e1e1-0006-4000-8000-000000000006", name: "Other Campus Finds" },
];

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  await connection();
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const previewMode =
    process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true";
  const { supabase, profile } = await requireApprovedMember();
  const { data } = previewMode
    ? { data: previewCategories }
    : await supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");
  const categories = (data && data.length > 0 ? data : previewCategories) as Category[];
  const errorMessage = errorCode ? authMessage(errorCode) : null;

  return (
    <main className="min-h-screen bg-[#f8f7f5] pb-24 text-[#28232f]">
      {/* STUDIO NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-[#e9e5ee] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-[70px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link className="flex items-center gap-2.5" href="/" aria-label="LOOPEC home">
              <BrandMark />
              <span className="text-sm font-extrabold tracking-[.14em] text-[#302546]">LOOPEC</span>
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-gray-200" />
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1 text-xs font-semibold text-violet-900 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <GraduationCap className="h-3.5 w-3.5 text-violet-700" />
              <span>NIT Calicut Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/listings"
              className="rounded-full border border-[#e4e0e8] bg-white px-4 py-2 text-xs font-semibold text-[#504a57] hover:border-violet-300 hover:text-violet-950 transition"
            >
              My Listings
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-800 hover:text-violet-950 transition"
            >
              <ArrowLeft size={14} /> Back to marketplace
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 sm:pt-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-[#7c7586]">
          <Link href="/marketplace" className="hover:text-violet-950 transition">
            Marketplace
          </Link>
          <ChevronRight size={13} className="text-gray-400" />
          <Link href="/listings" className="hover:text-violet-950 transition">
            Seller Studio
          </Link>
          <ChevronRight size={13} className="text-gray-400" />
          <span className="font-semibold text-violet-900">New Listing</span>
        </nav>

        {/* Page Header */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 pb-8 border-b border-[#ece8ef]">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-violet-700">
              <PackagePlus size={15} />
              <span>NIT Calicut Campus Exchange</span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#28232f]">
              Create a Listing
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#706877]">
              Share an item for sale, propose a trade exchange, or offer a free senior giveaway to verified peers across campus.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 font-semibold shadow-sm">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>0% Commission · 100% Peer-to-Peer</span>
          </div>
        </div>

        {/* Error notice if present */}
        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {errorMessage}
          </div>
        )}

        {/* Main 2-Column Listing Form & Realtime Preview */}
        <div className="mt-8">
          <ListingForm
            categories={categories}
            sellerName={profile.full_name || "Verified NITC Member"}
          />
        </div>
      </div>
    </main>
  );
}
