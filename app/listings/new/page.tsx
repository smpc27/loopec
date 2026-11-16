import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthShell, FormNotice } from "@/components/auth/auth-shell";
import { requireApprovedMember } from "@/lib/auth/member";
import { authMessage } from "@/lib/auth/messages";
import { ListingForm } from "@/components/listings/listing-form";

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

export default async function NewListingPage({ searchParams }: PageProps<"/listings/new">) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const previewMode = process.env.NODE_ENV === "development" && process.env.LOOPEC_DEV_BYPASS_AUTH === "true";
  const { supabase, profile } = await requireApprovedMember();
  const { data } = previewMode
    ? { data: previewCategories }
    : await supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");
  const categories = ((data && data.length > 0) ? data : previewCategories) as Category[];
  const errorMessage = errorCode ? authMessage(errorCode) : null;

  return (
    <AuthShell eyebrow="Seller studio" title="Create a listing" description="List an item for sale, trade, or free giveaway with your college community. Listings are reviewed before they appear in search." footer={<Link className="font-semibold text-violet-800 hover:text-violet-950" href="/listings">My listings</Link>}>
      <div className="space-y-5">
        {errorMessage ? <FormNotice>{errorMessage}</FormNotice> : null}
        {!profile.college_id ? (
          <FormNotice>Your approved profile needs a college assignment before you can list an item.</FormNotice>
        ) : categories.length === 0 ? (
          <FormNotice>No active categories are configured yet. Contact your college admin.</FormNotice>
        ) : (
          <ListingForm categories={categories} />
        )}
        <Link className="inline-flex items-center gap-2 text-xs font-semibold text-[#77717e] hover:text-violet-950" href="/marketplace"><ArrowLeft size={14} /> Return to marketplace</Link>
      </div>
    </AuthShell>
  );
}
