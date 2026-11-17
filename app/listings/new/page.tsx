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
    <main className="min-h-screen bg-transparent pb-24 text-[#241e14]">
      {/* STUDIO NAVIGATION BAR - FROSTED GLASS */}
      <header className="sticky top-0 z-40 border-b border-[#d0c1ab]/40 bg-white/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(36,30,20,0.03)]">
        <div className="mx-auto flex min-h-[60px] sm:min-h-[64px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link className="flex items-center gap-2.5" href="/" aria-label="LOOPEC home">
              <BrandMark compact />
              <span className="text-base font-black tracking-[.14em] text-[#241e14]">LOOPEC</span>
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-[#d0c1ab]/50" />
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#d0c1ab]/60 bg-[#eee9e2] px-2.5 py-1 text-[11px] font-semibold text-[#5f574d] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <GraduationCap className="h-3.5 w-3.5 text-[#241e14]" />
              <span>NIT Calicut Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/listings"
              className="rounded-full border border-[#d0c1ab]/70 bg-white/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#5f574d] hover:border-[#241e14] hover:text-[#241e14] shadow-sm transition"
            >
              My Listings
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#241e14] hover:underline transition"
            >
              <ArrowLeft size={14} /> Marketplace
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-[#736b60]">
          <Link href="/marketplace" className="hover:text-[#241e14] transition">
            Marketplace
          </Link>
          <ChevronRight size={13} className="text-[#d0c1ab]" />
          <Link href="/listings" className="hover:text-[#241e14] transition">
            Seller Studio
          </Link>
          <ChevronRight size={13} className="text-[#d0c1ab]" />
          <span className="font-bold text-[#241e14]">New Listing</span>
        </nav>

        {/* Page Header */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#d0c1ab]/40">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#8e7a63]">
              <PackagePlus size={14} className="text-[#241e14]" />
              <span>NIT Calicut Campus Exchange</span>
            </div>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl tracking-[-.05em] text-[#241e14]">
              Create a Listing
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#736b60]">
              Share an item for sale, propose a trade exchange, or offer a free senior giveaway to verified peers across campus.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 backdrop-blur-md px-4 py-2 text-xs text-[#241e14] font-semibold shadow-sm">
            <ShieldCheck size={15} className="text-[#241e14] shrink-0" />
            <span>0% Commission · 100% Peer-to-Peer</span>
          </div>
        </div>

        {/* Error notice if present */}
        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {errorMessage}
          </div>
        )}

        {/* Main 2-Column Listing Form & Realtime Preview */}
        <div className="mt-6">
          <ListingForm
            categories={categories}
            sellerName={profile.full_name || "Verified NITC Member"}
          />
        </div>
      </div>
    </main>
  );
}
