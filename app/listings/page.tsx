import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CirclePlus, PackageOpen, Pencil, Trash2 } from "lucide-react";
import { requireApprovedMember } from "@/lib/auth/member";
import { deleteListing, withdrawListing } from "@/app/listings/actions";
import { authMessage } from "@/lib/auth/messages";
import { SiteHeader } from "@/components/navigation/site-header";

export const instant = false;

type Listing = { id: string; category_id: string; name: string; description: string; price: number | string; status: string; quantity: number; moderation_notes: string | null; created_at: string };
const statusLabels: Record<string, string> = { draft: "Draft", pending: "In review", approved: "Live", sold: "Sold", rejected: "Needs an update", removed: "Unavailable" };

export default async function MyListingsPage({ searchParams }: PageProps<"/listings">) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error) ? params.error[0] : params.error;
  const { supabase, userId, profile } = await requireApprovedMember();
  const { data: listingData } = await supabase.from("products").select("id, category_id, name, description, price, status, quantity, moderation_notes, created_at").eq("seller_id", userId).order("created_at", { ascending: false });
  const listings = (listingData ?? []) as Listing[];
  const ids = listings.map((listing) => listing.id);
  const categoryIds = [...new Set(listings.map((listing) => listing.category_id))];
  const [{ data: imageData }, { data: categoryData }] = await Promise.all([
    ids.length ? supabase.from("product_images").select("product_id, storage_path, sort_order").in("product_id", ids).order("sort_order") : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from("categories").select("id, name").in("id", categoryIds) : Promise.resolve({ data: [] }),
  ]);
  const paths = new Map<string, string>();
  for (const image of (imageData ?? []) as { product_id: string; storage_path: string; sort_order: number }[]) if (!paths.has(image.product_id)) paths.set(image.product_id, image.storage_path);
  const signed = await Promise.all([...paths.entries()].map(async ([id, path]) => {
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 15 * 60);
    return [id, data?.signedUrl ?? null] as const;
  }));
  const images = new Map(signed);
  const categories = new Map(((categoryData ?? []) as { id: string; name: string }[]).map((item) => [item.id, item.name]));

  return (
    <main className="min-h-screen bg-transparent">
      {/* Global Responsive Site Header */}
      <SiteHeader
        profile={profile}
        sectionTitle="Seller Studio"
      />
      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-full border border-[#d0c1ab]/50 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#524a40] hover:bg-white hover:text-[#241e14] shadow-xs transition">
          <ArrowLeft size={14} /> Marketplace
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#8e7a63]">Your seller studio</p>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl tracking-tight text-[#241e14]">My listings</h1>
            <p className="mt-1.5 text-base text-[#524a40]">Track review status and manage your campus items.</p>
          </div>
          <Link className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#241e14] px-6 text-sm font-bold text-[#eee9e2] hover:bg-[#382f20] shadow-sm transition" href="/listings/new">
            <CirclePlus size={16} /> New listing
          </Link>
        </div>
        <div className="mt-6 space-y-4">
          {errorCode ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{authMessage(errorCode)}</p> : null}
          {params.submitted ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your listing is now live on the campus marketplace!</p> : null}
          {params.deleted ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Draft listing deleted.</p> : null}
          {params.withdrawn ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">The live listing was removed from the marketplace. Its order history is kept.</p> : null}
          {listings.length ? (
            <div className="space-y-3.5">
              {listings.map((listing) => {
                const canEdit = listing.status === "draft" || listing.status === "rejected";
                const image = images.get(listing.id);
                return (
                  <article className="flex gap-4 rounded-[24px] border border-[#d0c1ab]/50 bg-white/90 backdrop-blur-xl p-4 sm:items-center sm:gap-5 sm:p-5 shadow-xs transition hover:border-[#8e7a63]" key={listing.id}>
                    <Link href={listing.status === "approved" ? `/marketplace/${listing.id}` : canEdit ? `/listings/${listing.id}/edit` : "/listings"} className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-[#eee9e2] sm:size-28 border border-[#d0c1ab]/40">
                      {image ? <Image src={image} alt={listing.name} fill sizes="112px" unoptimized className="object-cover" /> : <span className="grid h-full place-items-center text-[#8e7a63]"><PackageOpen size={24} /></span>}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${listing.status === "approved" ? "border border-emerald-300 bg-emerald-50 text-emerald-900" : listing.status === "rejected" ? "border border-amber-300 bg-amber-50 text-amber-950" : "border border-[#d0c1ab] bg-[#eee9e2] text-[#241e14]"}`}>
                          {statusLabels[listing.status] ?? listing.status}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#8e7a63]">
                          {categories.get(listing.category_id) ?? "Campus find"}
                        </span>
                      </div>
                      <h2 className="mt-2 truncate text-base sm:text-lg font-bold text-[#241e14]">{listing.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#524a40]">{listing.description}</p>
                      <p className="mt-2 text-base font-bold text-[#241e14]">
                        ₹{Number(listing.price).toLocaleString("en-IN")}{" "}
                        <span className="text-sm font-semibold text-[#736b60]">· {listing.quantity} available</span>
                      </p>
                      {listing.moderation_notes ? (
                        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm leading-6 text-amber-950">
                          <strong>Admin feedback:</strong> {listing.moderation_notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      {canEdit ? (
                        <Link className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d0c1ab] bg-white px-4 text-xs sm:text-sm font-bold text-[#241e14] hover:bg-[#eee9e2] transition shadow-xs" href={`/listings/${listing.id}/edit`}>
                          <Pencil size={14} /> Edit draft
                        </Link>
                      ) : (
                        <Link className="inline-flex min-h-10 items-center rounded-full border border-[#d0c1ab] bg-white px-4 text-xs sm:text-sm font-bold text-[#241e14] hover:bg-[#eee9e2] transition shadow-xs" href={listing.status === "approved" ? `/marketplace/${listing.id}` : "/listings"}>
                          View status
                        </Link>
                      )}
                      {canEdit ? (
                        <form action={deleteListing}>
                          <input type="hidden" name="product_id" value={listing.id} />
                          <button className="inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-50 cursor-pointer" type="submit">
                            <Trash2 size={14} /> Delete draft
                          </button>
                        </form>
                      ) : listing.status === "approved" ? (
                        <form action={withdrawListing}>
                          <input type="hidden" name="product_id" value={listing.id} />
                          <button className="inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-50 cursor-pointer" type="submit">
                            <Trash2 size={14} /> Remove listing
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#d0c1ab] bg-white/90 px-6 py-16 text-center shadow-xs">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eee9e2] text-[#241e14]">
                <PackageOpen size={24} />
              </span>
              <h2 className="mt-4 font-serif text-2xl text-[#241e14]">Your seller studio is ready.</h2>
              <p className="mt-2 text-sm text-[#736b60]">Share your first useful campus find with the community.</p>
              <Link className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#241e14] px-5 text-sm font-bold text-[#eee9e2] hover:bg-[#382f20]" href="/listings/new">
                Create a listing
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
