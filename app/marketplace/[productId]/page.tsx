import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Bookmark, Gift, MessageCircle, PackageOpen, RefreshCw, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { ProductCard, type MarketplaceProduct } from "@/components/marketplace/product-card";
import { requireApprovedMember } from "@/lib/auth/member";
import { addToCart, buyNow, reportListing, startConversation, toggleWishlist } from "@/app/marketplace/actions";
import { SiteHeader } from "@/components/navigation/site-header";
import { getFirestoreProductById } from "@/lib/firebase/firestore";

export const instant = false;

type Product = {
  id: string;
  seller_id: string;
  college_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number | string;
  item_condition: MarketplaceProduct["item_condition"];
  quantity: number;
  is_featured: boolean;
  published_at: string | null;
};

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const conditionLabels: Record<Product["item_condition"], string> = { new: "New", like_new: "Like new", good: "Good", used: "Used" };

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export default async function ProductDetailsPage({ params, searchParams }: PageProps<"/marketplace/[productId]">) {
  const [{ productId }, search] = await Promise.all([params, searchParams]);
  const { supabase, userId, profile } = await requireApprovedMember();

  let productData: Product | null = null;
  if (isValidUuid(productId)) {
    const { data } = await supabase
      .from("products")
      .select("id, seller_id, college_id, category_id, name, description, price, item_condition, quantity, is_featured, published_at")
      .eq("id", productId)
      .eq("status", "approved")
      .eq("college_id", profile.college_id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    productData = data as Product | null;
  }

  // If not found in Supabase, check Google Firestore
  let firestoreDoc = null;
  if (!productData) {
    firestoreDoc = await getFirestoreProductById(productId);
    if (!firestoreDoc) notFound();
  }

  const product: Product = productData
    ? productData
    : {
        id: firestoreDoc!.id,
        seller_id: firestoreDoc!.seller_id,
        college_id: profile.college_id || "nit-calicut",
        category_id: firestoreDoc!.category_id,
        name: firestoreDoc!.name,
        description: firestoreDoc!.description,
        price: firestoreDoc!.price,
        item_condition: firestoreDoc!.item_condition,
        quantity: firestoreDoc!.quantity,
        is_featured: firestoreDoc!.is_featured,
        published_at: firestoreDoc!.published_at,
      };

  const isProdUuid = isValidUuid(product.id);
  const isSellerUuid = isValidUuid(product.seller_id);
  const isCatUuid = isValidUuid(product.category_id);

  const [
    { data: sellerData },
    { data: categoryData },
    { data: imageData },
    { data: savedData },
    { data: reviewData },
    { data: relatedData },
  ] = await Promise.all([
    isSellerUuid
      ? supabase.from("profiles").select("id, full_name, handle, role, verification_status, phone").eq("id", product.seller_id).maybeSingle()
      : Promise.resolve({ data: null }),
    isCatUuid
      ? supabase.from("categories").select("name, slug").eq("id", product.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    isProdUuid
      ? supabase.from("product_images").select("id, storage_path, alt_text, sort_order").eq("product_id", product.id).order("sort_order")
      : Promise.resolve({ data: [] }),
    isProdUuid
      ? supabase.from("wishlists").select("product_id").eq("user_id", userId).eq("product_id", product.id).maybeSingle()
      : Promise.resolve({ data: null }),
    isSellerUuid
      ? supabase.from("reviews").select("rating").eq("reviewed_user_id", product.seller_id).limit(100)
      : Promise.resolve({ data: [] }),
    isCatUuid && isProdUuid
      ? supabase.from("products").select("id, seller_id, category_id, name, description, price, item_condition, quantity, is_featured, published_at").eq("college_id", product.college_id).eq("category_id", product.category_id).eq("status", "approved").gt("quantity", 0).neq("id", product.id).order("published_at", { ascending: false, nullsFirst: false }).limit(4)
      : Promise.resolve({ data: [] }),
  ]);

  const seller = (sellerData as { id: string; full_name: string; handle: string; role: string; verification_status: string; phone?: string | null } | null) || (firestoreDoc ? {
    id: firestoreDoc.seller_id,
    full_name: firestoreDoc.sellerName || "Campus Peer",
    handle: firestoreDoc.sellerHandle || "member",
    role: "student",
    verification_status: "approved",
    phone: firestoreDoc.sellerPhone || null,
  } : null);

  const category = (categoryData as { name: string; slug: string } | null) || (firestoreDoc ? {
    name: firestoreDoc.categoryName || "Campus item",
    slug: firestoreDoc.category_id || "campus-item",
  } : null);

  const images = (imageData ?? []) as { id: string; storage_path: string; alt_text: string; sort_order: number }[];
  const reviewRatings = (reviewData ?? []).map((item) => Number((item as { rating: number }).rating));
  const averageRating = reviewRatings.length ? reviewRatings.reduce((sum, rating) => sum + rating, 0) / reviewRatings.length : null;
  const imageUrls = await Promise.all(images.map(async (image) => {
    const { data } = await supabase.storage.from("product-images").createSignedUrl(image.storage_path, 15 * 60);
    return { ...image, url: data?.signedUrl ?? null };
  }));

  if (imageUrls.length === 0 && firestoreDoc?.imageUrl) {
    imageUrls.push({
      id: "firestore-img-1",
      storage_path: "",
      alt_text: firestoreDoc.name,
      sort_order: 0,
      url: firestoreDoc.imageUrl,
    });
  }
  const otherProducts = (relatedData ?? []) as Product[];
  const relatedSellerIds = [...new Set(otherProducts.map((item) => item.seller_id))];
  const [{ data: relatedSellers }, { data: relatedImages }, { data: relatedSaved }] = await Promise.all([
    relatedSellerIds.length ? supabase.from("profiles").select("id, full_name, handle").in("id", relatedSellerIds) : Promise.resolve({ data: [] }),
    otherProducts.length ? supabase.from("product_images").select("product_id, storage_path, sort_order").in("product_id", otherProducts.map((item) => item.id)).order("sort_order") : Promise.resolve({ data: [] }),
    otherProducts.length ? supabase.from("wishlists").select("product_id").eq("user_id", userId).in("product_id", otherProducts.map((item) => item.id)) : Promise.resolve({ data: [] }),
  ]);
  const relatedSellerMap = new Map(((relatedSellers ?? []) as { id: string; full_name: string; handle: string }[]).map((item) => [item.id, item]));
  const relatedImageMap = new Map<string, string>();
  for (const image of (relatedImages ?? []) as { product_id: string; storage_path: string; sort_order: number }[]) if (!relatedImageMap.has(image.product_id)) relatedImageMap.set(image.product_id, image.storage_path);
  const relatedUrls = await Promise.all([...relatedImageMap.entries()].map(async ([id, path]) => {
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 15 * 60);
    return [id, data?.signedUrl ?? null] as const;
  }));
  const relatedUrlMap = new Map(relatedUrls);
  const categoryName = category?.name ?? "Campus finds";
  const relatedCards: MarketplaceProduct[] = otherProducts.map((item) => {
    const itemSeller = relatedSellerMap.get(item.seller_id);
    return {
      ...item,
      categoryName,
      sellerName: itemSeller?.full_name ?? "Verified member",
      sellerHandle: itemSeller?.handle ?? "member",
      imageUrl: relatedUrlMap.get(item.id) ?? null,
    };
  });
  const query = await search;
  const error = Array.isArray(query.error) ? query.error[0] : query.error;
  const savedRelated = new Set((relatedSaved ?? []).map((item) => (item as { product_id: string }).product_id));
  const sellerRole = seller?.role === "faculty" ? "Faculty" : seller?.role === "staff" ? "College staff" : "Student";

  const isGiveaway = Number(product.price) === 0 || product.description.includes("[GIVEAWAY]");
  const isTrade = product.description.includes("[TRADE") || product.name.toLowerCase().includes("trade");
  let tradeWishlist: string | null = null;
  if (isTrade) {
    const match = product.description.match(/\[TRADE:\s*([^\]]+)\]/i);
    if (match) tradeWishlist = match[1].trim();
  }
  const cleanDescription = product.description
    .replace(/\[GIVEAWAY\]\s*/gi, "")
    .replace(/\[TRADE:\s*[^\]]+\]\s*/gi, "")
    .trim();

  const rawSellerPhone = (seller?.phone || "").replace(/\D/g, "");
  const waSellerPhone = rawSellerPhone.length === 10 ? `91${rawSellerPhone}` : rawSellerPhone;

  let waText = `Hi ${seller?.full_name || "there"}! 👋 I saw your listing for "${product.name}" (₹${product.price}) on LOOPEC. Is it still available for campus pickup?`;
  if (isGiveaway) {
    waText = `Hi ${seller?.full_name || "there"}! 👋 I saw your free campus giveaway for "${product.name}" on LOOPEC. I'd love to claim it if still available for campus pickup!`;
  } else if (isTrade) {
    waText = `Hi ${seller?.full_name || "there"}! 👋 I saw your listing for "${product.name}" on LOOPEC looking to trade for "${tradeWishlist || "items"}". I'd like to propose an exchange with you!`;
  }

  const waInquiryLink = waSellerPhone ? `https://wa.me/${waSellerPhone}?text=${encodeURIComponent(waText)}` : null;

  return (
    <main className="min-h-screen bg-transparent">
      {/* Global Responsive Site Header */}
      <SiteHeader
        profile={profile}
        sectionTitle="Marketplace"
      />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
        <Link className="inline-flex items-center gap-2 rounded-full border border-[#d0c1ab]/60 bg-white/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-[#5f574d] hover:bg-white hover:text-[#241e14] hover:border-[#8e7a63] shadow-xs transition" href="/marketplace"><ArrowLeft size={14} /> Back to marketplace</Link>
        {error ? <p role="alert" className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 backdrop-blur-md px-4 py-3 text-sm text-amber-950 shadow-sm">{error === "stock" ? "There is not enough stock for another item." : error === "rate_limit" ? "You’ve made several reports in a short time. Please wait before submitting another." : "This listing is not available for that action."}</p> : null}
        {search.reported ? <p className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/80 backdrop-blur-md px-4 py-3 text-sm text-emerald-800 shadow-sm">Thank you. Your report was sent to a college administrator for review.</p> : null}
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(350px,.9fr)] lg:gap-12">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {imageUrls.length ? imageUrls.map((image, index) => (
              <div className={`relative aspect-square overflow-hidden rounded-[26px] border border-[#d0c1ab]/50 bg-[#e8e2d8]/40 shadow-xs ${index === 0 && imageUrls.length > 1 ? "col-span-2 aspect-[1.45/1]" : ""}`} key={image.id}>
                {image.url ? <Image src={image.url} alt={image.alt_text || product.name} fill sizes="(max-width: 1024px) 90vw, 55vw" unoptimized className="object-cover" /> : <span className="grid h-full place-items-center text-[#8e7a63]"><PackageOpen size={34} /></span>}
              </div>
            )) : <div className="col-span-2 grid aspect-[1.15/1] place-items-center rounded-[26px] border border-[#d0c1ab]/50 bg-[#e8e2d8]/40 text-[#8e7a63] shadow-xs"><PackageOpen size={40} strokeWidth={1.2} /></div>}
          </div>
          <div className="lg:pt-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em]">
              <span className="text-[#8e7a63]">{categoryName}</span>
              {isGiveaway ? (
                <>
                  <span className="text-[#d0c1ab]">·</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-700 px-2.5 py-0.5 text-white shadow-xs backdrop-blur-sm">
                    <Gift size={12} /> Free Giveaway
                  </span>
                </>
              ) : isTrade ? (
                <>
                  <span className="text-[#d0c1ab]">·</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#8e7a63]/40 bg-[#8e7a63] px-2.5 py-0.5 text-[#eee9e2] shadow-xs backdrop-blur-sm">
                    <RefreshCw size={12} /> Trade / Barter
                  </span>
                </>
              ) : null}
              {product.is_featured ? <><span className="text-[#d0c1ab]">·</span><span className="inline-flex items-center gap-1 text-[#241e14]"><Sparkles size={12} /> Featured</span></> : null}
            </div>

            <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#241e14] sm:text-5xl">{product.name}</h1>

            {isGiveaway ? (
              <div className="mt-4">
                <p className="text-3xl font-extrabold tracking-tight text-emerald-700">FREE</p>
                <p className="mt-1 text-xs font-semibold text-emerald-800">Campus Senior Donation / Free Giveaway</p>
              </div>
            ) : isTrade ? (
              <div className="mt-4">
                <p className="text-2xl font-bold tracking-tight text-[#241e14]">Trade / Barter</p>
                {Number(product.price) > 0 ? (
                  <p className="mt-1 text-xs text-[#736b60]">Valued ~ {currency.format(Number(product.price))}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-3xl font-semibold tracking-tight text-[#241e14]">{currency.format(Number(product.price))}</p>
            )}

            {isTrade && tradeWishlist ? (
              <div className="mt-5 rounded-2xl border border-[#d0c1ab] bg-[#eee9e2]/60 backdrop-blur-md p-4 shadow-xs">
                <p className="text-xs font-bold text-[#241e14] flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-[#8e7a63]" />
                  Looking to exchange for:
                </p>
                <p className="mt-2 text-sm font-semibold text-[#241e14] bg-white/90 rounded-xl px-3.5 py-2.5 border border-[#d0c1ab]/50 shadow-xs">
                  {tradeWishlist}
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d0c1ab]/50 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-[#5f574d] shadow-xs">{conditionLabels[product.item_condition]}</span>
              <span className="rounded-full border border-[#d0c1ab]/50 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 text-xs font-medium text-[#5f574d] shadow-xs">{product.quantity} available</span>
            </div>

            <div className="mt-7 border-t border-[#d0c1ab]/40 pt-6">
              <h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#8e7a63]">About this item</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5f574d]">{cleanDescription || product.description}</p>
            </div>

            <div className="mt-7 rounded-[26px] border border-[#d0c1ab]/50 bg-white/90 backdrop-blur-xl p-4 sm:p-5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-[.13em] text-[#8e7a63]">Seller</p>
              <div className="mt-3 flex items-center justify-between gap-4">
                <Link href={`/members/${seller?.handle ?? "member"}`} className="group flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eee9e2] font-serif text-lg text-[#241e14] shadow-xs">{(seller?.full_name ?? "M").slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0"><b className="flex items-center gap-1.5 truncate text-sm text-[#241e14] group-hover:text-[#8e7a63]">{seller?.full_name ?? "Verified member"}{seller?.verification_status === "approved" ? <BadgeCheck size={15} className="shrink-0 text-[#8e7a63]" /> : null}</b><small className="mt-1 block text-xs text-[#736b60]">{sellerRole} · @{seller?.handle ?? "member"}</small></span>
                </Link>
                <div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#241e14]">{averageRating ? `${averageRating.toFixed(1)} / 5` : "New seller"}</p><small className="text-[11px] text-[#736b60]">{reviewRatings.length ? `${reviewRatings.length} reviews` : "No reviews yet"}</small></div>
              </div>
            </div>

            {product.seller_id !== userId ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {isGiveaway ? (
                  <>
                    {waInquiryLink ? (
                      <a
                        href={waInquiryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 sm:col-span-2"
                      >
                        <Gift size={18} />
                        <span>Claim Free Giveaway on WhatsApp</span>
                      </a>
                    ) : null}
                    {isProdUuid ? (
                      <div className="flex gap-2 sm:col-span-2">
                        <form action={startConversation} className="flex-1">
                          <input type="hidden" name="product_id" value={product.id} />
                          <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#d0c1ab] bg-white/90 backdrop-blur-md px-4 text-sm font-semibold text-[#241e14] shadow-xs transition hover:bg-[#eee9e2]/50 hover:border-[#8e7a63]" type="submit">
                            <MessageCircle size={16} /> Message to claim pickup
                          </button>
                        </form>
                        <form action={toggleWishlist}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="return_to" value={`/marketplace/${product.id}`} />
                          <button className="grid size-12 shrink-0 place-items-center rounded-full border border-[#d0c1ab] bg-white/90 backdrop-blur-md text-[#241e14] shadow-xs transition hover:bg-[#eee9e2]/50 hover:border-[#8e7a63]" type="submit" title={savedData ? "Remove from wishlist" : "Save to wishlist"} aria-label={savedData ? "Remove from wishlist" : "Save to wishlist"}>
                            <Bookmark size={17} fill={savedData ? "currentColor" : "none"} />
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </>
                ) : isTrade ? (
                  <>
                    {waInquiryLink ? (
                      <a
                        href={waInquiryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#8e7a63] px-5 text-sm font-bold text-[#eee9e2] shadow-sm transition hover:bg-[#786650] sm:col-span-2"
                      >
                        <RefreshCw size={18} />
                        <span>Propose Trade on WhatsApp</span>
                      </a>
                    ) : null}
                    {isProdUuid ? (
                      <div className="flex gap-2 sm:col-span-2">
                        <form action={startConversation} className="flex-1">
                          <input type="hidden" name="product_id" value={product.id} />
                          <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#d0c1ab] bg-white/90 backdrop-blur-md px-4 text-sm font-semibold text-[#241e14] shadow-xs transition hover:bg-[#eee9e2]/50 hover:border-[#8e7a63]" type="submit">
                            <MessageCircle size={16} /> Message to propose swap
                          </button>
                        </form>
                        <form action={toggleWishlist}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="return_to" value={`/marketplace/${product.id}`} />
                          <button className="grid size-12 shrink-0 place-items-center rounded-full border border-[#d0c1ab] bg-white/90 backdrop-blur-md text-[#241e14] shadow-xs transition hover:bg-[#eee9e2]/50 hover:border-[#8e7a63]" type="submit" title={savedData ? "Remove from wishlist" : "Save to wishlist"} aria-label={savedData ? "Remove from wishlist" : "Save to wishlist"}><Bookmark size={17} fill={savedData ? "currentColor" : "none"} /></button>
                        </form>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {isProdUuid ? (
                      <>
                        <form action={addToCart}><input type="hidden" name="product_id" value={product.id} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#d0c1ab] bg-white/90 backdrop-blur-md px-5 text-sm font-semibold text-[#241e14] shadow-xs transition hover:bg-[#eee9e2]/50 hover:border-[#8e7a63]" type="submit"><ShoppingBag size={16} /> Add to cart</button></form>
                        <form action={buyNow}><input type="hidden" name="product_id" value={product.id} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#241e14] px-5 text-sm font-semibold text-[#eee9e2] shadow-sm transition hover:bg-[#382f20]" type="submit">Buy now <ShoppingBag size={16} /></button></form>
                      </>
                    ) : null}

                    {waInquiryLink ? (
                      <a
                        href={waInquiryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#20ba59] sm:col-span-2"
                      >
                        <MessageCircle size={18} />
                        <span>Chat & Buy on WhatsApp ({seller?.phone || "Seller"})</span>
                      </a>
                    ) : null}

                    {isProdUuid ? (
                      <div className="flex gap-2 sm:col-span-2">
                        <form action={startConversation} className="flex-1"><input type="hidden" name="product_id" value={product.id} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#d0c1ab] bg-white/90 backdrop-blur-md px-4 text-sm font-semibold text-[#241e14] shadow-xs transition hover:bg-[#eee9e2]/50 hover:border-[#8e7a63]" type="submit"><MessageCircle size={16} /> In-app message</button></form>
                        <form action={toggleWishlist}><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="return_to" value={`/marketplace/${product.id}`} /><button className="grid size-12 shrink-0 place-items-center rounded-full border border-[#d0c1ab] bg-white/90 backdrop-blur-md text-[#241e14] shadow-xs transition hover:bg-[#eee9e2]/50 hover:border-[#8e7a63]" type="submit" title={savedData ? "Remove from wishlist" : "Save to wishlist"} aria-label={savedData ? "Remove from wishlist" : "Save to wishlist"}><Bookmark size={17} fill={savedData ? "currentColor" : "none"} /></button></form>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : <p className="mt-5 rounded-2xl border border-[#d0c1ab] bg-[#eee9e2]/60 backdrop-blur-md px-4 py-3 text-sm text-[#241e14] shadow-xs">This is your listing. Manage it from <Link className="font-semibold underline underline-offset-4 hover:text-[#8e7a63]" href="/listings">My listings</Link>.</p>}
            {product.seller_id !== userId ? <details className="mt-5 rounded-2xl border border-[#d0c1ab]/50 bg-white/80 backdrop-blur-md px-4 py-3 shadow-xs"><summary className="cursor-pointer text-xs font-semibold text-[#736b60]">Report this listing</summary><form action={reportListing} className="mt-4 space-y-3"><input type="hidden" name="product_id" value={product.id} /><label className="block text-xs font-semibold text-[#5f574d]">Reason<select className="mt-2 min-h-11 w-full rounded-xl border border-[#d0c1ab] bg-white px-3 text-sm outline-none focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-xs" name="reason" required defaultValue=""><option value="" disabled>Select a reason</option><option value="prohibited_item">Prohibited item</option><option value="misleading_listing">Misleading listing</option><option value="safety">Safety concern</option><option value="harassment">Harassment</option><option value="other">Other</option></select></label><label className="block text-xs font-semibold text-[#5f574d]">Details <span className="font-normal">(optional)</span><textarea className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#d0c1ab] bg-white p-3 text-sm outline-none focus:border-[#241e14] focus:ring-4 focus:ring-[#d0c1ab]/30 shadow-xs" name="details" maxLength={2000} /></label><button className="min-h-10 rounded-full border border-rose-200 px-4 text-xs font-semibold text-rose-800 hover:bg-rose-50" type="submit">Send report to admin</button></form></details> : null}
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#736b60]"><ShieldCheck className="mt-0.5 shrink-0 text-[#8e7a63]" size={15} /> Arrange pickup at an approved campus location and coordinate through LOOPEC messages.</p>
          </div>
        </div>
        {relatedCards.length ? <section className="mt-16 border-t border-[#d0c1ab]/40 pt-9"><div className="flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">From the same category</p><h2 className="mt-2 font-serif text-3xl tracking-tight text-[#241e14]">More around your campus</h2></div><Link className="text-xs font-semibold text-[#241e14] hover:text-[#8e7a63] underline underline-offset-4" href={`/marketplace?category=${product.category_id}`}>See all</Link></div><div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{relatedCards.map((item) => <ProductCard key={item.id} product={item} saved={savedRelated.has(item.id)} currentUserId={userId} returnTo={`/marketplace/${product.id}`} />)}</div></section> : null}
      </section>
    </main>
  );
}
