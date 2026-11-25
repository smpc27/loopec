import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard, type MarketplaceProduct } from "@/components/marketplace/product-card";
import { SavedCampusItems } from "@/components/wishlist/saved-campus-items";
import { requireApprovedMember } from "@/lib/auth/member";
import { SiteHeader } from "@/components/navigation/site-header";
import { getFirestoreProducts } from "@/lib/firebase/firestore";

export const instant = false;

type Product = {
  id: string; seller_id: string; category_id: string; name: string; description: string; price: number | string;
  item_condition: MarketplaceProduct["item_condition"]; quantity: number; is_featured: boolean; published_at: string | null;
};

export default async function WishlistPage() {
  const { supabase, userId, profile } = await requireApprovedMember();
  const [{ data: savedData }, firestoreRaw] = await Promise.all([
    supabase.from("wishlists").select("product_id").eq("user_id", userId).order("created_at", { ascending: false }),
    getFirestoreProducts().catch(() => []),
  ]);
  const savedIds = (savedData ?? []).map((item) => (item as { product_id: string }).product_id);
  const { data: productData } = savedIds.length
    ? await supabase.from("products").select("id, seller_id, category_id, name, description, price, item_condition, quantity, is_featured, published_at").in("id", savedIds).eq("status", "approved").gt("quantity", 0)
    : { data: [] };
  const products = (productData ?? []) as Product[];
  const sellerIds = [...new Set(products.map((product) => product.seller_id))];
  const categoryIds = [...new Set(products.map((product) => product.category_id))];
  const productIds = products.map((product) => product.id);
  const [{ data: sellerData }, { data: categoryData }, { data: imageData }] = await Promise.all([
    sellerIds.length ? supabase.from("profiles").select("id, full_name, handle").in("id", sellerIds) : Promise.resolve({ data: [] }),
    categoryIds.length ? supabase.from("categories").select("id, name").in("id", categoryIds) : Promise.resolve({ data: [] }),
    productIds.length ? supabase.from("product_images").select("product_id, storage_path, sort_order").in("product_id", productIds).order("sort_order") : Promise.resolve({ data: [] }),
  ]);
  const sellers = new Map(((sellerData ?? []) as { id: string; full_name: string; handle: string }[]).map((item) => [item.id, item]));
  const categories = new Map(((categoryData ?? []) as { id: string; name: string }[]).map((item) => [item.id, item.name]));
  const paths = new Map<string, string>();
  for (const image of (imageData ?? []) as { product_id: string; storage_path: string; sort_order: number }[]) if (!paths.has(image.product_id)) paths.set(image.product_id, image.storage_path);
  const signed = await Promise.all([...paths.entries()].map(async ([id, path]) => {
    const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 15 * 60);
    return [id, data?.signedUrl ?? null] as const;
  }));
  const images = new Map(signed);
  const cards: MarketplaceProduct[] = products.map((product) => {
    const seller = sellers.get(product.seller_id);
    return { ...product, categoryName: categories.get(product.category_id) ?? "Campus finds", sellerName: seller?.full_name ?? "Verified member", sellerHandle: seller?.handle ?? "member", imageUrl: images.get(product.id) ?? null };
  });

  const existingIds = new Set(cards.map((c) => c.id));
  const firestoreCards: MarketplaceProduct[] = firestoreRaw
    .filter((fp) => !existingIds.has(fp.id))
    .map((fp) => ({
      id: fp.id,
      seller_id: fp.seller_id,
      category_id: fp.category_id,
      name: fp.name,
      description: fp.description,
      price: fp.price,
      item_condition: fp.item_condition,
      quantity: fp.quantity,
      is_featured: fp.is_featured,
      published_at: fp.published_at,
      categoryName: fp.categoryName,
      sellerName: fp.sellerName,
      sellerHandle: fp.sellerHandle,
      imageUrl: fp.imageUrl,
    }));

  return (
    <main className="min-h-screen bg-transparent">
      <SiteHeader
        profile={profile}
        sectionTitle="Wishlist"
      />
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-xs font-semibold text-[#736b60] hover:text-[#241e14] transition"><ArrowLeft size={14} /> Marketplace</Link>
        <div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8e7a63]">Saved for later</p><h1 className="mt-2 font-serif text-4xl tracking-[-.05em] text-[#241e14]">Your wishlist</h1></div>
        {cards.length ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((product) => <ProductCard key={product.id} product={product} saved returnTo="/wishlist" currentUserId={userId} />)}
          </div>
        ) : null}

        <SavedCampusItems firestoreProducts={firestoreCards} currentUserId={userId} hasDbSaved={cards.length > 0} />
      </section>
    </main>
  );
}
