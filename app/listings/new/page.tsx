import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthShell, FormNotice } from "@/components/auth/auth-shell";
import { requireApprovedMember } from "@/lib/auth/member";
import { authMessage } from "@/lib/auth/messages";
import { ListingForm } from "@/components/listings/listing-form";

export const instant = false;

type Category = { id: string; name: string };

export default async function NewListingPage({ searchParams }: PageProps<"/listings/new">) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const { supabase, profile } = await requireApprovedMember();
  const { data } = await supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");
  const categories = (data ?? []) as Category[];
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
